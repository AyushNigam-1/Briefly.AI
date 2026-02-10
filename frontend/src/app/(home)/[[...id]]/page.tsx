"use client";

import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { metadata, query } from "../../types";
import { Loader2, Paperclip, SendHorizontal } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import ContentDialog from "../../components/ContentDialog";
import Chats from "../../components/Chats";
import { useMutations } from "../../hooks/useMutations";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import Navbar from "@/app/components/Navbar";

const Page = () => {
  const { id } = useParams();
  const router = useRouter();

  const rawId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<metadata | null>(null);
  const doc = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const { sendQuery } = useMutations();

  const [queries, setQueries] = useState<query[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();

  // Load history when URL id changes
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
    setLoading(true);
    if (e.target.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
    setLoading(false);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setUrl("");
    setQueries(prev => [...prev, { sender: "user", content: text }]);
    try {
      const data = await sendQuery.mutateAsync({
        query: text,
        id: activeId!, // undefined on first message
      });
      if (!activeId && data.id) {
        setActiveId(data.id);
        router.replace(`/${data.id}`);
      }
      setQueries(prev => [...prev, { sender: "llm", content: data.res }]);
    } catch (e) {
      console.error("Send failed", e);
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
              queries={queries}
              setQueries={setQueries}
              isPending={sendQuery.isPending}
              handleSend={handleSend}
            />
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            className="fixed top-1/2 left-1/2 w-full max-w-3xl px-4 text-white"
          >
            <div className="flex flex-col gap-10">

              <div className="text-center">
                <h3 className="text-5xl font-bold">How can I help you today?</h3>
                <p className="text-gray-400 mt-4">
                  Ask anything, upload docs, brainstorm, or chat.
                </p>
              </div>

              <div className="flex gap-4 items-end">
                <span className="w-full">

                  <div className="flex bg-white/5 rounded-full">
                    <button
                      className="bg-gray-900 rounded-full p-4 flex items-center justify-center"
                      onClick={() => doc.current?.click()}
                    >
                      <input
                        ref={doc}
                        type="file"
                        hidden
                        multiple
                        onChange={handleFileChange}
                      />
                      <Paperclip />
                    </button>

                    <input
                      value={url ?? ""}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && url && handleSend(url)}
                      className="bg-transparent w-full outline-none pl-2"
                      placeholder="Ask AI..."
                    />
                  </div>

                </span>

                <button
                  disabled={!url}
                  onClick={() => url && handleSend(url)}
                  className="p-4 bg-gray-900 rounded-full"
                >
                  {sendQuery.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <SendHorizontal />
                  )}
                </button>
              </div>

              <ContentDialog
                metadata={metadata}
                setMetadata={setMetadata}
                setUrl={setUrl}
                url={url}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Page;
