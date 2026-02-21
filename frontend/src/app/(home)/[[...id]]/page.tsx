"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { metadata, query } from "../../types";
import Chats from "../../components/ui/Chats";
import { useMutations } from "../../hooks/useMutations";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import Navbar from "@/app/components/ui/Navbar";
import InputBox from "@/app/components/ui/InputBox";
import Sidebar from "@/app/components/ui/panels/Sidebar";
import { fetchEventSource } from '@microsoft/fetch-event-source';

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
  const [isPending, setPending] = useState(false)
  const [files, setFiles] = useState<File[]>([]);
  const streamBuffer = useRef("");
  const flushTimer = useRef<NodeJS.Timeout | null>(null);
  // Load history when query id changes
  useEffect(() => {
    if (!rawId) {
      setQueries([]);
      setActiveId(undefined);
      return;
    }

    setQueries([]);
    setActiveId(rawId);

    const fetchHistory = async () => {
      try {
        const token = Cookies.get("access_token");
        const res = await axios.get(`http://localhost:8000/history/${rawId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.history) {
          setQueries(res.data.history);
        }
      } catch (e) {
        console.error("History load failed", e);
      }
    };

    fetchHistory();
  }, [rawId]);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // setLoading(true);
    if (e.target.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
    // setLoading(false);
  };

  const handleSend = async (query: string, files: File[], modal: string) => {
    setPending(true)
    if (!query.trim()) return;

    setQuery("");
    setFiles([]);

    // 1️⃣ Push user message
    setQueries(prev => [
      ...prev,
      {
        sender: "user",
        content: query,
        files: files.map(file => ({ name: file.name, size: file.size, type: file.type, url: "" }))
      },
      { sender: "llm", content: "", sources: [] }
    ]);

    try {
      const form = new FormData();
      form.append("query", query);
      if (activeId) form.append("id", activeId);
      form.append("modal_name", modal);
      files.forEach(file => form.append("files", file));

      let assistantText = "";

      await fetchEventSource("http://localhost:8000/query", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,

        async onopen(response) {
          setPending(false)
          if (response.ok) return; // Everything is good
          throw new Error(`Failed to connect: ${response.status}`);
        },
        onmessage(msg) {
          const parsed = JSON.parse(msg.data);
          if (parsed.type === "token") {
            assistantText += parsed.data;
            setQueries(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content = assistantText;
              return updated;
            });
          }

          if (parsed.type === "done") {
            if (!activeId && parsed.id) {
              setActiveId(parsed.id);
              router.replace(`/${parsed.id}`);
            }
            setQueries(prev => {
              const updated = [...prev];
              updated[updated.length - 1].sources = parsed.sources || [];
              return updated;
            });
          }

          if (parsed.type === "blocked") {
            setQueries(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                sender: "llm",
                content: "Sorry — I can’t help with that request.",
                blocked: true
              };
              return updated;
            });
          }
        },
        onerror(err) {
          console.error("Stream error:", err);
          throw err;
        }
      });

    } catch (err) {
      console.error("Streaming failed", err);
    }
  };
  return (
    <>
      <Navbar component={<Sidebar />} />
      <AnimatePresence mode="wait">
        {activeId && queries.length > 0 ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full"
          >
            <Chats
              query={query}
              queries={queries}
              setQueries={setQueries}
              isPending={isPending}
              handleSend={handleSend}
              setQuery={setQuery}
              files={files}
              setFiles={setFiles}
              handleFileChange={handleFileChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            className="fixed top-1/2 left-1/2 w-full max-w-3xl px-4 text-white">
            <div className="flex flex-col gap-10 font-mono">
              <div className="text-center space-y-4">
                <h3 className="text-2xl md:text-4xl font-bold">How can I help you today?</h3>
                <p className="text-gray-400">
                  Ask anything, upload docs, brainstorm, or chat.
                </p>
                <InputBox query={query} setQuery={setQuery} send={handleSend} isPending={sendQuery.isPending} handleFileChange={handleFileChange} files={files} setFiles={setFiles} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Page;
