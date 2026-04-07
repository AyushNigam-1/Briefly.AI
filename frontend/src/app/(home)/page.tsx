"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import InputBox from "@/app/components/ui/InputBox";
import Chats from "@/app/components/ui/Chats";
import { query as QueryType } from "@/app/types";
import { Ghost, Loader2 } from "lucide-react";
import api, { streamChat } from "@/app/lib/api";
import { authClient } from "@/app/lib/auth-client";
import { Suspense } from "react";

const Home = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawId = searchParams.get("id");

  const { data } = authClient.useSession();
  const user = data?.user
  const isExplicitPrivate = rawId === "private";
  const isPrivateMode = isExplicitPrivate || !user;

  const [query, setQuery] = useState<string>("");
  const [queries, setQueries] = useState<QueryType[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();

  const [chatKey, setChatKey] = useState<string>("new-chat");

  const [isPending, setPending] = useState(false);
  const [selectedModel, setSelectedModel] = useState("default_model");

  const isSendingRef = useRef(false);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const savedModelValue = localStorage.getItem('selectedModel');
    if (savedModelValue) {
      setSelectedModel(savedModelValue);
    }
  }, []);

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
      const res = await api.get(`/history/${rawId}?${params}`);
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
  }, [rawId, isPrivateMode]);

  useEffect(() => {
    if (!rawId) {
      setQueries([]);
      setActiveId(undefined);
      setChatKey("new-chat");
      setHasMore(true);
      setOldestCreatedAt(null);
      setIsInitialLoad(false);
      return;
    }

    if (isExplicitPrivate) {
      setQueries([]);
      setActiveId("private");
      setChatKey("private-chat");
      setHasMore(false);
      setOldestCreatedAt(null);
      setIsInitialLoad(false);
      return;
    }

    if (isTransitioningRef.current) {
      isTransitioningRef.current = false;
      setActiveId(rawId);
      return;
    }

    setQueries([]);
    setActiveId(rawId);
    setChatKey(rawId);
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
    console.log("file change")
  };

  const executePrivateStream = async (form: FormData) => {
    abortControllerRef.current = new AbortController();

    let accumulatedContent = "";
    let accumulatedThinking = "";

    try {
      await streamChat({
        endpoint: "/query/private",
        body: form,
        abortController: abortControllerRef.current,
        isPrivate: true,
        onToken(token) {
          accumulatedContent += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], content: accumulatedContent };
            return up;
          })
        },
        onThinking(token) {
          accumulatedThinking += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], thinking: accumulatedThinking };
            return up;
          })
        },
        onDone(sources) {
          isSendingRef.current = false;
          setPending(false)
          if (sources) {
            setQueries(prev => {
              const up = [...prev];
              const lastIdx = up.length - 1;
              up[lastIdx] = { ...up[lastIdx], sources: sources };
              return up;
            })
          }
        },
        onBlocked() {
          isSendingRef.current = false;
          setPending(false)
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = {
              ...up[lastIdx],
              sender: "llm",
              content: "Sorry — I can’t help with that request.",
              blocked: true,
            };
            return up;
          })
        }
      })
    } catch (err: any) {
      isSendingRef.current = false;
      setPending(false)
      console.error("Private streaming failed", err)
    }
  }

  const handleRegenerate = async (targetIndex: number) => {
    if (isSendingRef.current || (!activeId && !isPrivateMode)) return
    isSendingRef.current = true;
    setPending(true)

    if (isPrivateMode) {
      const truncated = queries.slice(0, targetIndex);
      const lastUserMsg = truncated[truncated.length - 1];
      setQueries([
        ...truncated,
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ]);

      const form = new FormData();
      form.append("query", lastUserMsg.content);
      if (selectedModel) form.append("modal_name", selectedModel);
      form.append("chat_history", JSON.stringify(truncated.slice(0, -1)));

      await executePrivateStream(form);
      return;
    }

    setQueries(prev => {
      const truncated = prev.slice(0, targetIndex)
      return [
        ...truncated,
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ]
    })

    abortControllerRef.current = new AbortController();

    let accumulatedContent = "";
    let accumulatedThinking = "";

    try {
      await streamChat({
        endpoint: `/chat/${activeId}/regenerate`,
        body: JSON.stringify({
          target_index: targetIndex,
          modal_name: selectedModel
        }),
        abortController: abortControllerRef.current,
        onToken(token) {
          accumulatedContent += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], content: accumulatedContent };
            return up;
          })
        },
        onThinking(token) {
          accumulatedThinking += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], thinking: accumulatedThinking };
            return up;
          })
        },
        onDone(sources: any) {
          isSendingRef.current = false;
          setPending(false)
          if (sources) {
            setQueries(prev => {
              const up = [...prev];
              const lastIdx = up.length - 1;
              up[lastIdx] = { ...up[lastIdx], sources: sources };
              return up;
            })
          }
        }
      })
    } catch (err) {
      isSendingRef.current = false;
      setPending(false)
      console.error("Regenerate failed", err)
    }
  }

  const handleEdit = async (targetIndex: number, newContent: string) => {
    if (isSendingRef.current || (!activeId && !isPrivateMode) || !newContent.trim()) return

    const oldFiles = queries[targetIndex]?.files || []

    isSendingRef.current = true;
    setPending(true)

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
      if (selectedModel) form.append("modal_name", selectedModel);
      form.append("chat_history", JSON.stringify(truncated));

      await executePrivateStream(form);
      return;
    }
    setQueries(prev => {
      const truncated = prev.slice(0, targetIndex)
      return [
        ...truncated,
        { sender: "user", content: newContent, files: oldFiles, created_at: "" },
        { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
      ]
    })

    abortControllerRef.current = new AbortController();

    let accumulatedContent = "";
    let accumulatedThinking = "";

    try {
      await streamChat({
        endpoint: `/chat/${activeId}/edit`,
        body: JSON.stringify({
          target_index: targetIndex,
          new_content: newContent,
          modal_name: selectedModel
        }),
        abortController: abortControllerRef.current,
        onToken(token) {
          accumulatedContent += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], content: accumulatedContent };
            return up;
          })
        },
        onThinking(token) {
          accumulatedThinking += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], thinking: accumulatedThinking };
            return up;
          })
        },
        onDone(sources) {
          isSendingRef.current = false;
          setPending(false)
          if (sources) {
            setQueries(prev => {
              const up = [...prev];
              const lastIdx = up.length - 1;
              up[lastIdx] = { ...up[lastIdx], sources: sources };
              return up;
            })
          }
        }
      })
    } catch (err) {
      isSendingRef.current = false;
      setPending(false)
      console.error("Edit failed", err)
    }
  }

  const handleSend = async (queryText: string, filesData: File[], modal: string) => {
    if (!queryText.trim() || isSendingRef.current) return;

    isSendingRef.current = true;
    setPending(true)
    setQuery("")

    const newQueriesState: QueryType[] = [
      ...queries,
      {
        sender: "user",
        content: queryText,
        files: filesData.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          url: ""
        })),
        created_at: ""
      },
      { sender: "llm", content: "", thinking: "", sources: [], created_at: "" }
    ]
    setQueries(newQueriesState)

    const form = new FormData()
    form.append("query", queryText)
    form.append("modal_name", modal)

    filesData.forEach(file => form.append("files", file))

    if (isPrivateMode) {
      const historyToSend = [...queries];
      form.append("chat_history", JSON.stringify(historyToSend));
      await executePrivateStream(form);
      return;
    }

    if (activeId) form.append("id", activeId)

    abortControllerRef.current = new AbortController();

    let accumulatedContent = "";
    let accumulatedThinking = "";

    try {
      await streamChat({
        endpoint: "/query",
        body: form,
        abortController: abortControllerRef.current,
        onToken(token) {
          accumulatedContent += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], content: accumulatedContent };
            return up;
          })
        },
        onThinking(token) {
          accumulatedThinking += token;
          setQueries(prev => {
            const up = [...prev];
            const lastIdx = up.length - 1;
            up[lastIdx] = { ...up[lastIdx], thinking: accumulatedThinking };
            return up;
          })
        },
        onDone(sources, newId, title) {
          isSendingRef.current = false;
          setPending(false)

          if (sources) {
            setQueries(prev => {
              const up = [...prev];
              const lastIdx = up.length - 1;
              up[lastIdx] = { ...up[lastIdx], sources: sources };
              return up;
            })
          }

          if (!activeId && newId) {
            isTransitioningRef.current = true;
            setActiveId(newId);
            window.dispatchEvent(new CustomEvent("chat-title", {
              detail: { id: newId, title: title || "New Chat" }
            }));
            router.replace(`/?id=${newId}`, { scroll: false });
          }
        },
        onBlocked() {
          isSendingRef.current = false;
          setPending(false)
        }
      })

    } catch (err) {
      isSendingRef.current = false;
      setPending(false)
      console.error("Streaming failed", err)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isSendingRef.current = false;
    setPending(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isInitialLoad ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center w-full h-[85vh]"
        >
          <div className="flex justify-center items-center py-2">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        </motion.div>
      ) : queries.length > 0 ? (

        <motion.div
          key={`chat-${chatKey}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full h-full overflow-none"
        >
          <Chats
            query={query}
            queries={queries}
            isPending={isPending}
            isLoadingOlder={isLoadingOlder}
            hasMore={hasMore}
            setQueries={setQueries}
            handleSend={handleSend}
            setQuery={setQuery}
            handleStop={handleStop}
            handleFileChange={handleFileChange}
            loadOlderChats={loadOlderChats}
            handleRegenerate={handleRegenerate}
            handleEdit={handleEdit}
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
            <div className="text-center relative w-full">

              <div className="relative h-[110px] sm:h-[120px] mb-3 md:mb-4 w-full">
                <AnimatePresence>
                  {isExplicitPrivate ? (
                    <motion.div
                      key="private"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="absolute bottom-0 inset-x-0 w-full flex flex-col items-center justify-end"
                    >
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                        Incognito Session
                      </h3>
                      <p className="text-sm sm:text-base transition-colors text-slate-500 dark:text-gray-400 mt-2">
                        Your history won't be saved. Close the tab to erase this session.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="normal"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="absolute bottom-0 inset-x-0 w-full flex flex-col items-center justify-end"
                    >
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                        How can I help you today?
                      </h3>
                      <p className="text-sm sm:text-base transition-colors text-slate-500 dark:text-gray-400 mt-2">
                        Ask anything, upload docs, brainstorm, or chat.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <InputBox
                query={query}
                setQuery={setQuery}
                send={handleSend}
                isPending={isPending}
                handleFileChange={handleFileChange}
                stop={handleStop}
              />

              <div className="relative mt-4 h-[44px] w-full flex justify-center">
                <AnimatePresence initial={false}>
                  {user && !isPrivateMode ? (
                    <motion.button
                      key="btn-private"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => router.push('/?id=private', { scroll: false })}
                      className="absolute top-0 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors hover:text-slate-700 text-slate-500 dark:text-gray-400 dark:hover:text-slate-300"
                    >
                      <Ghost size={14} /> Go Private
                    </motion.button>
                  ) : user && isPrivateMode ? (
                    <motion.button
                      key="btn-normal"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => router.push('/', { scroll: false })}
                      className="absolute top-0 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors hover:text-slate-700 text-slate-500 dark:text-gray-400 dark:hover:text-slate-300"
                    >
                      <Ghost size={14} className="opacity-60" /> Exit Private Mode
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </motion.div>
      )
      }
    </AnimatePresence >
  );
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-[80vh]">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}