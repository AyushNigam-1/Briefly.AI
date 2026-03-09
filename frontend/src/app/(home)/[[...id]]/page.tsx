"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import InputBox from "@/app/components/ui/InputBox";
import { fetchEventSource } from '@microsoft/fetch-event-source';
import Chats from "@/app/components/ui/Chats";
import { query as QueryType } from "@/app/types";
import { Ghost, Loader2 } from "lucide-react";

class StopRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StopRetryError";
  }
}

const Page = () => {
  const { id } = useParams();
  const router = useRouter();
  const rawId = Array.isArray(id) ? id[0] : id;
  const [isMounted, setIsMounted] = useState(false);
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    setToken(Cookies.get("access_token"));
    setIsMounted(true);
  }, []);

  const isExplicitPrivate = rawId === "private";
  const isPrivateMode = isExplicitPrivate || !token;

  const [query, setQuery] = useState<string>("");
  const [queries, setQueries] = useState<QueryType[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [isPending, setPending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(!!rawId && !isExplicitPrivate);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [oldestCreatedAt, setOldestCreatedAt] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (before?: string) => {
    if (!rawId || isPrivateMode) return;

    const params = new URLSearchParams({ limit: before ? "10" : "10" });
    if (before) params.append("before", before);

    try {
      const res = await axios.get(
        `http://localhost:8000/history/${rawId}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newHistory: QueryType[] = res.data?.history || [];
      const serverHasMore = res.data?.has_more ?? (newHistory.length === 30);

      if (before) {
        setQueries((prev) => [...newHistory, ...prev]);
        if (newHistory.length > 0) {
          setOldestCreatedAt(newHistory[0].created_at || null);
        }
        setHasMore(serverHasMore);
      } else {
        setQueries(newHistory);
        setHasMore(serverHasMore);
        setOldestCreatedAt(newHistory.length > 0 ? newHistory[0].created_at || null : null);
      }
    } catch (e) {
      console.error("History load failed", e);
    } finally {
      if (before) setIsLoadingOlder(false);
      setIsInitialLoad(false);
    }
  }, [rawId, isPrivateMode, token]);

  useEffect(() => {
    if (isExplicitPrivate) {
      setQueries([]);
      setActiveId("private");
      setHasMore(false);
      setOldestCreatedAt(null);
      setIsInitialLoad(false);
      return;
    }

    if (!rawId) {
      setQueries([]);
      setActiveId(undefined);
      setHasMore(true);
      setOldestCreatedAt(null);
      setIsInitialLoad(false);
      return;
    }

    setQueries([]);
    setActiveId(rawId);
    setHasMore(true);
    setOldestCreatedAt(null);
    setIsInitialLoad(true);

    fetchHistory();
  }, [rawId, isExplicitPrivate, fetchHistory]);

  const loadOlderChats = useCallback(async () => {
    if (!oldestCreatedAt || !hasMore || isLoadingOlder || isPrivateMode) return;

    setIsLoadingOlder(true);
    await fetchHistory(oldestCreatedAt);
  }, [oldestCreatedAt, hasMore, isLoadingOlder, fetchHistory, isPrivateMode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const executePrivateStream = async (form: FormData) => {
    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource("http://localhost:8000/query/private", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (!response.ok) throw new StopRetryError(`Failed to connect: ${response.status}`);
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
              updated[updated.length - 1].thinking = (updated[updated.length - 1].thinking || "") + parsed.data;
              return updated;
            });
          }

          if (parsed.type === "done") {
            setPending(false);
            if (parsed.sources) {
              setQueries(prev => {
                const updated = [...prev];
                updated[updated.length - 1].sources = parsed.sources;
                return updated;
              });
            }
            abortControllerRef.current?.abort();
          }

          if (parsed.type === "error") {
            setPending(false);
            console.error("Backend error:", parsed.message);
            abortControllerRef.current?.abort();
          }
        },
        onclose() {
          throw new StopRetryError("Stream closed normally");
        },
        onerror(err) {
          if (err instanceof StopRetryError || err.name === 'AbortError') throw err;
          setPending(false);
          console.error("Stream error:", err);
          throw err;
        }
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err instanceof StopRetryError) return;
      setPending(false);
      console.error("Streaming failed", err);
    }
  };


  const handleRegenerate = async (targetIndex: number) => {
    if (isPending || (!activeId && !isPrivateMode)) return;

    const savedModelValue = localStorage.getItem('selectedModel');
    setPending(true);

    if (isPrivateMode) {
      const truncated = queries.slice(0, targetIndex);
      const lastUserMsg = truncated[truncated.length - 1];

      setQueries([
        ...truncated,
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ]);

      const form = new FormData();
      form.append("query", lastUserMsg.content);
      if (savedModelValue) form.append("modal_name", savedModelValue);
      form.append("chat_history", JSON.stringify(truncated.slice(0, -1)));

      await executePrivateStream(form);
      return;
    }

    setQueries((prev) => {
      const truncated = prev.slice(0, targetIndex);
      return [
        ...truncated,
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ];
    });

    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource(`http://localhost:8000/chat/${activeId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target_index: targetIndex,
          modal_name: savedModelValue
        }),
        signal: abortControllerRef.current.signal,
        async onopen(response) {
          if (!response.ok) throw new StopRetryError("Connection failed");
        },
        onmessage(msg) {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "token") setQueries(prev => { const up = [...prev]; up[up.length - 1].content += parsed.data; return up; });
          if (parsed.type === "thinking") setQueries(prev => { const up = [...prev]; up[up.length - 1].thinking = (up[up.length - 1].thinking || "") + parsed.data; return up; });
          if (parsed.type === "done") {
            setPending(false);
            if (parsed.sources) setQueries(prev => { const up = [...prev]; up[up.length - 1].sources = parsed.sources; return up; });
            abortControllerRef.current?.abort();
          }
          if (parsed.type === "error") { setPending(false); abortControllerRef.current?.abort(); }
        },
        onclose() { throw new StopRetryError("Closed"); },
        onerror(err) {
          if (err instanceof StopRetryError || err.name === 'AbortError') throw err;
          setPending(false);
          throw err;
        }
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err instanceof StopRetryError) return;
      setPending(false);
    }
  };


  const handleEdit = async (targetIndex: number, newContent: string) => {
    if (isPending || (!activeId && !isPrivateMode) || !newContent.trim()) return;

    const savedModelValue = localStorage.getItem('selectedModel');
    const oldFiles = queries[targetIndex]?.files || [];

    setPending(true);

    if (isPrivateMode) {
      const truncated = queries.slice(0, targetIndex);
      const updatedQueries: QueryType[] = [
        ...truncated,
        { sender: "user", content: newContent, files: oldFiles, created_at: "" },
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ];
      setQueries(updatedQueries);

      const form = new FormData();
      form.append("query", newContent);
      if (savedModelValue) form.append("modal_name", savedModelValue);
      form.append("chat_history", JSON.stringify(truncated));

      await executePrivateStream(form);
      return;
    }

    setQueries((prev) => {
      const truncated = prev.slice(0, targetIndex);
      return [
        ...truncated,
        { sender: "user", content: newContent, files: oldFiles, created_at: "" },
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ];
    });

    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource(`http://localhost:8000/chat/${activeId}/edit`, {
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
          if (!response.ok) throw new StopRetryError("Connection failed");
        },
        onmessage(msg) {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "token") setQueries(prev => { const up = [...prev]; up[up.length - 1].content += parsed.data; return up; });
          if (parsed.type === "thinking") setQueries(prev => { const up = [...prev]; up[up.length - 1].thinking = (up[up.length - 1].thinking || "") + parsed.data; return up; });
          if (parsed.type === "done") {
            setPending(false);
            if (parsed.sources) setQueries(prev => { const up = [...prev]; up[up.length - 1].sources = parsed.sources; return up; });
            abortControllerRef.current?.abort();
          }
          if (parsed.type === "error") { setPending(false); abortControllerRef.current?.abort(); }
        },
        onclose() { throw new StopRetryError("Closed"); },
        onerror(err) {
          if (err instanceof StopRetryError || err.name === 'AbortError') throw err;
          setPending(false);
          throw err;
        }
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err instanceof StopRetryError) return;
      setPending(false);
    }
  };


  const handleSend = async (queryText: string, filesData: File[], modal: string) => {
    setPending(true);
    if (!queryText.trim()) return;

    setQuery("");
    setFiles([]);

    const newQueriesState: QueryType[] = [
      ...queries,
      {
        sender: "user",
        content: queryText,
        files: filesData.map(file => ({ name: file.name, size: file.size, type: file.type, url: "" })),
        created_at: ""
      },
      { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
    ];

    const historyToSend = [...queries];
    setQueries(newQueriesState);

    const form = new FormData();
    form.append("query", queryText);
    form.append("modal_name", modal);
    filesData.forEach(file => form.append("files", file));

    if (isPrivateMode) {
      form.append("chat_history", JSON.stringify(historyToSend));
      await executePrivateStream(form);
      return;
    }

    if (activeId) {
      form.append("id", activeId);
    }

    try {
      abortControllerRef.current = new AbortController();

      await fetchEventSource("http://localhost:8000/query", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: abortControllerRef.current.signal,

        async onopen(response) {
          if (!response.ok) throw new StopRetryError(`Failed to connect: ${response.status}`);
        },

        onmessage(msg) {
          const parsed = JSON.parse(msg.data);

          if (parsed.type === "token") setQueries(prev => { const up = [...prev]; up[up.length - 1].content += parsed.data; return up; });
          if (parsed.type === "thinking") setQueries(prev => { const up = [...prev]; up[up.length - 1].thinking = (up[up.length - 1].thinking || "") + parsed.data; return up; });

          if (parsed.type === "done") {
            setPending(false);

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

            abortControllerRef.current?.abort();
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
            abortControllerRef.current?.abort();
          }
        },
        onclose() { throw new StopRetryError("Closed"); },
        onerror(err) {
          if (err instanceof StopRetryError || err.name === 'AbortError') throw err;
          setPending(false);
          console.error("Stream error:", err);
          throw err;
        }
      });

    } catch (err: any) {
      if (err?.name === 'AbortError' || err instanceof StopRetryError) return;
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
  if (!isMounted) {
    return null;
  }
  return (
    <AnimatePresence mode="wait">
      {isInitialLoad ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center w-full h-[80vh]"
        >
          <div className="flex justify-center items-center py-2">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        </motion.div>
      ) : queries.length > 0 ? (
        <motion.div
          key="chat"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
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
            handleEdit={handleEdit}
            removeFile={removeFile}

          />
        </motion.div>
      ) : (
        <motion.div
          key="intro"
          initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
          animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
          exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-55%" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed top-1/2 left-1/2 w-full max-w-3xl px-4 sm:px-6 transition-colors duration-300 text-slate-800 dark:text-white"
        >
          <div className="flex flex-col gap-6 md:gap-10 font-mono">
            <div className="text-center relative">

              {/* Smooth Animation Wrapper for Headings */}
              <div className="min-h-[80px] flex flex-col justify-end mb-3 md:mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isExplicitPrivate ? "private" : "normal"}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {isExplicitPrivate ? (
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                        Incognito Session
                      </h3>
                    ) : (
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                        How can I help you today?
                      </h3>
                    )}

                    <p className="text-sm sm:text-base transition-colors text-slate-500 dark:text-gray-400 mt-2">
                      {isExplicitPrivate
                        ? "Your history won't be saved. Close the tab to erase this session."
                        : "Ask anything, upload docs, brainstorm, or chat."}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <InputBox
                query={query}
                setQuery={setQuery}
                send={handleSend}
                isPending={isPending}
                handleFileChange={handleFileChange}
                files={files}
                stop={handleStop}
                removeFile={removeFile}
              />

              {token && (!activeId || isPrivateMode) && (
                <div className="pt-4 flex justify-center">
                  {!isPrivateMode ? (
                    <button
                      onClick={() => router.push('/private')}
                      className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors  hover:text-slate-700 text-slate-500 dark:text-gray-400 dark:hover:text-slate-300"
                    >
                      <Ghost size={14} /> Go Private
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/')}
                      className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors  hover:text-slate-700 text-slate-500 dark:text-gray-400 dark:hover:text-slate-300"
                    >
                      <Ghost size={14} className="opacity-60" /> Exit Private Mode
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Page;