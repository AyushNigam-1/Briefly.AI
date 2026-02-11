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
import InputBox from "@/app/components/InputBox";

const Page = () => {
  const { id } = useParams();
  const router = useRouter();

  const rawId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [metadata, setMetadata] = useState<metadata | null>(null);
  const { sendQuery } = useMutations();
  const [queries, setQueries] = useState<query[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();

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



  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setQuery("");
    setQueries(prev => [...prev, { sender: "user", content: text }]);
    try {
      const data = await sendQuery.mutateAsync({
        query: text,
        id: activeId!, // undefined on first message
        files: []
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
              query={query}
              queries={queries}
              setQueries={setQueries}
              isPending={sendQuery.isPending}
              handleSend={handleSend}
              setQuery={setQuery}
            />
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            className="fixed top-1/2 left-1/2 w-full max-w-3xl px-4 text-white">
            <div className="flex flex-col gap-10">
              <div className="text-center space-y-4">
                <h3 className="text-4xl md:text-5xl font-bold">How can I help you today?</h3>
                <p className="text-gray-400">
                  Ask anything, upload docs, brainstorm, or chat.
                </p>
                <InputBox query={query} setQuery={setQuery} send={handleSend} isPending={sendQuery.isPending} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Page;
