"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import InputBox from "@/app/components/ui/InputBox";
import { fetchEventSource } from '@microsoft/fetch-event-source';
import Chats from "@/app/components/ui/Chats";
import { metadata, query } from "@/app/types";
import { useMutations } from "@/app/hooks/useMutations";

const Page = () => {
  const { id } = useParams();
  const router = useRouter();
  const token = Cookies.get("access_token");
  const rawId = Array.isArray(id) ? id[0] : id;

  const [query, setQuery] = useState<string>("");
  const [metadata, setMetadata] = useState<metadata | null>(null);
  const { sendQuery } = useMutations();
  const [queries, setQueries] = useState<query[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [isPending, setPending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // 🌟 NEW: State to track if we are fetching history on page load
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(!!rawId);

  // ── Infinite scroll states ─────────────────────────────────────
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [oldestCreatedAt, setOldestCreatedAt] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reusable history fetcher
  const fetchHistory = useCallback(async (before?: string) => {
    if (!rawId) return;

    const params = new URLSearchParams({ limit: before ? "10" : "10" });
    if (before) params.append("before", before);

    try {
      const res = await axios.get(
        `http://10.207.18.43:8000/history/${rawId}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newHistory: query[] = res.data?.history || [];
      const serverHasMore = res.data?.has_more ?? (newHistory.length === 30);

      if (before) {
        // Prepend older messages
        setQueries((prev) => [...newHistory, ...prev]);
        if (newHistory.length > 0) {
          setOldestCreatedAt(newHistory[0].created_at);
        }
        setHasMore(serverHasMore);
      } else {
        // Initial load
        setQueries(newHistory);
        setHasMore(serverHasMore);
        setOldestCreatedAt(newHistory.length > 0 ? newHistory[0].created_at : null);
      }
    } catch (e) {
      console.error("History load failed", e);
    } finally {
      if (before) setIsLoadingOlder(false);
      // 🌟 NEW: Turn off initial loading once fetch is complete
      setIsInitialLoad(false);
    }
  }, [rawId, token]);

  // Load history when conversation ID changes
  useEffect(() => {
    if (!rawId) {
      setQueries([]);
      setActiveId(undefined);
      setHasMore(true);
      setOldestCreatedAt(null);
      setIsInitialLoad(false); // Ensure loading is off if there's no ID
      return;
    }

    setQueries([]);
    setActiveId(rawId);
    setHasMore(true);
    setOldestCreatedAt(null);
    setIsInitialLoad(true); // 🌟 Trigger loading state when ID changes

    fetchHistory(); // initial load (no "before")
  }, [rawId, fetchHistory]);

  // Load older chats when user scrolls up
  const loadOlderChats = useCallback(async () => {
    if (!oldestCreatedAt || !hasMore || isLoadingOlder) return;

    setIsLoadingOlder(true);
    await fetchHistory(oldestCreatedAt);
  }, [oldestCreatedAt, hasMore, isLoadingOlder, fetchHistory]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

  // 🌟 NEW REGENERATE FUNCTION
  const handleRegenerate = async (targetIndex: number) => {
    if (isPending || !activeId) return;

    // 🌟 1. Grab the saved model from localStorage before making the request
    const savedModelValue = localStorage.getItem('selectedModel');

    setPending(true);
    setQueries((prev) => {
      const truncated = prev.slice(0, targetIndex);
      return [
        ...truncated,
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ];
    });

    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource(`http://10.207.18.43:8000/chat/${activeId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        // 🌟 2. Add modal_name to the payload alongside target_index
        body: JSON.stringify({
          target_index: targetIndex,
          modal_name: savedModelValue // This sends the string, or null if it doesn't exist
        }),
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (!response.ok) throw new Error(`Failed to connect: ${response.status}`);
        },

        onmessage(msg) {
          const parsed = JSON.parse(msg.data);

          if (parsed.type === "token") {
            setQueries((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += parsed.data;
              return updated;
            });
          }

          if (parsed.type === "thinking") {
            setQueries((prev) => {
              const updated = [...prev];
              const currentThinking = updated[updated.length - 1].thinking || "";
              updated[updated.length - 1].thinking = currentThinking + parsed.data;
              return updated;
            });
          }

          if (parsed.type === "done") {
            setPending(false);
            if (parsed.sources) {
              setQueries((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].sources = parsed.sources;
                return updated;
              });
            }
          }

          if (parsed.type === "error") {
            setPending(false);
            console.error("Backend generation error:", parsed.message);
          }
        },

        onerror(err) {
          setPending(false);
          console.error("Stream error:", err);
          throw err;
        }
      });
    } catch (err) {
      setPending(false);
      console.error("Regeneration failed", err);
    }
  };
  // 🌟 NEW EDIT FUNCTION
  const handleEdit = async (targetIndex: number, newContent: string) => {
    if (isPending || !activeId || !newContent.trim()) return;

    const savedModelValue = localStorage.getItem('selectedModel');

    // Capture the old files before we slice the array
    const oldFiles = queries[targetIndex]?.files || [];

    setPending(true);
    setQueries((prev) => {
      // Keep everything before the edited message
      const truncated = prev.slice(0, targetIndex);
      return [
        ...truncated,
        // Insert the updated user message
        { sender: "user", content: newContent, files: oldFiles, created_at: "" },
        // Insert the blank LLM response for the stream
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ];
    });

    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource(`http://10.207.18.43:8000/chat/${activeId}/edit`, { // Adjust URL if needed
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target_index: targetIndex,
          new_content: newContent,
          modal_name: savedModelValue
        }),
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (!response.ok) throw new Error(`Failed to connect: ${response.status}`);
        },

        onmessage(msg) {
          const parsed = JSON.parse(msg.data);

          if (parsed.type === "token") {
            setQueries((prev) => {
              const updated = [...prev];
              updated[updated.length - 1].content += parsed.data;
              return updated;
            });
          }

          if (parsed.type === "thinking") {
            setQueries((prev) => {
              const updated = [...prev];
              const currentThinking = updated[updated.length - 1].thinking || "";
              updated[updated.length - 1].thinking = currentThinking + parsed.data;
              return updated;
            });
          }

          if (parsed.type === "done") {
            setPending(false);
            if (parsed.sources) {
              setQueries((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].sources = parsed.sources;
                return updated;
              });
            }
          }

          if (parsed.type === "error") {
            setPending(false);
            console.error("Backend generation error:", parsed.message);
          }
        },

        onerror(err) {
          setPending(false);
          console.error("Stream error:", err);
          throw err;
        }
      });
    } catch (err) {
      setPending(false);
      console.error("Edit failed", err);
    }
  };
  const handleSend = async (query: string, files: File[], modal: string) => {
    setPending(true);
    if (!query.trim()) return;

    setQuery("");
    setFiles([]);

    setQueries(prev => [
      ...prev,
      {
        sender: "user",
        content: query,
        files: files.map(file => ({ name: file.name, size: file.size, type: file.type, url: "" })),
        created_at: ""
      },
      { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
    ]);

    try {
      const form = new FormData();
      form.append("query", query);
      if (activeId) form.append("id", activeId);
      form.append("modal_name", modal);
      files.forEach(file => form.append("files", file));

      abortControllerRef.current = new AbortController();

      let finalMetadata: any = null;

      await fetchEventSource("http://10.207.18.43:8000/query", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (!response.ok) throw new Error(`Failed to connect: ${response.status}`);
        },

        onmessage(msg) {
          const parsed = JSON.parse(msg.data);

          if (parsed.type === "token") {
            setQueries(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content += parsed.data;
              return updated;
            });
          }

          if (parsed.type === "thinking") {
            setQueries(prev => {
              const updated = [...prev];
              const currentThinking = updated[updated.length - 1].thinking || "";
              updated[updated.length - 1].thinking = currentThinking + parsed.data;
              return updated;
            });
          }

          if (parsed.type === "done") {
            setPending(false);
            finalMetadata = parsed;

            if (parsed.sources) {
              setQueries(prev => {
                const updated = [...prev];
                updated[updated.length - 1].sources = parsed.sources;
                return updated;
              });
            }

            if (!activeId && parsed.id) {
              setActiveId(parsed.id);
              router.replace(`/${parsed.id}`);
            }
          }

          if (parsed.type === "blocked") {
            setPending(false);
            setQueries(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                sender: "llm",
                content: "Sorry — I can’t help with that request.",
                blocked: true,
                created_at: ''
              };
              return updated;
            });
          }
        },

        onerror(err) {
          setPending(false);
          console.error("Stream error:", err);
          throw err;
        }
      });

    } catch (err) {
      setPending(false);
      console.error("Streaming failed", err);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPending(false);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isInitialLoad ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center w-full h-[80vh]"
          >
            <div className="flex space-x-2 items-center text-slate-400 dark:text-gray-500">
              <span className="animate-pulse">Loading conversation...</span>
            </div>
          </motion.div>
        ) : activeId && queries.length > 0 ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full overflow-none"
          >
            <Chats
              query={query}
              queries={queries}
              files={files}
              isPending={isPending}
              isLoadingOlder={isLoadingOlder}
              hasMore={hasMore}
              setQueries={setQueries}
              handleSend={handleSend}
              setQuery={setQuery}
              setFiles={setFiles}
              handleStop={handleStop}
              handleFileChange={handleFileChange}
              loadOlderChats={loadOlderChats}
              handleRegenerate={handleRegenerate}
              handleEdit={handleEdit} // 🌟 Added here
            />
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            className="fixed top-1/2 left-1/2 w-full max-w-3xl px-4 sm:px-6 transition-colors duration-300
    text-slate-800 
    dark:text-white"
          >
            <div className="flex flex-col gap-6 md:gap-10 font-mono">
              <div className="text-center space-y-3 md:space-y-4">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  How can I help you today?
                </h3>

                <p className="text-sm sm:text-base transition-colors text-slate-500 dark:text-gray-400">
                  Ask anything, upload docs, brainstorm, or chat.
                </p>
                <InputBox
                  query={query}
                  setQuery={setQuery}
                  send={handleSend}
                  isPending={sendQuery.isPending}
                  handleFileChange={handleFileChange}
                  files={files}
                  stop={handleStop}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Page;