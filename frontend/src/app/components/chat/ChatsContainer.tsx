import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { VList, VListHandle } from "virtua";
import ChatInput from "./ChatInput";
import { ChatsProps } from "@/app/types";
import Message from "./MessageList";
import SourcesSidebar from "./SourcesPanel";

const Chats = ({
  queries,
  isPending,
  handleSend,
  query: searchInput,
  setQuery,
  handleFileChange,
  handleStop,
  loadOlderChats,
  isLoadingOlder,
  hasMore,
  handleRegenerate,
  handleEdit,
}: ChatsProps) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  const vlistRef = useRef<VListHandle>(null);
  const atBottomRef = useRef(true);

  const handleScroll = (offset: number) => {
    if (!vlistRef.current) return;
    // Load older chats when scrolling near the top
    if (offset < 50 && hasMore && !isLoadingOlder) {
      loadOlderChats();
    }
    const { scrollSize, viewportSize } = vlistRef.current;
    atBottomRef.current = scrollSize - (offset + viewportSize) < 100;
  };

  useEffect(() => {
    if (!vlistRef.current || queries.length === 0) return;
    if (atBottomRef.current || isPending) {
      vlistRef.current.scrollToIndex(queries.length - 1, { align: "end" });
    }
  }, [queries, isPending]);

  const copyToClipboard = async (text?: string) => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    // 🌟 FIX 1: Wrap everything in a flex column container instead of a fragment
    <div className="flex flex-col w-full h-full relative">
      <div className="flex flex-col items-center w-full h-[calc(100dvh-190px)] relative">
        <div className="w-full max-w-6xl h-full relative">
          {isLoadingOlder && (
            <div className="absolute top-0 left-0 w-full z-10">
              <div className="h-1 w-full bg-slate-100 dark:bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-primary w-1/3"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          )}

          <VList
            ref={vlistRef}
            data={queries}
            onScroll={handleScroll}
            shift={isLoadingOlder}
            className="scrollbar-none overflow-x-hidden h-full w-full "
          >
            {(q, index) => {
              const uniqueKey = q.id
                ? q.id
                : `msg-${q.created_at || "local"}-${q.sender}-${q.content.length}`;

              return (
                <Message
                  key={uniqueKey}
                  q={q}
                  isLastItem={index === queries.length - 1}
                  isPending={isPending}
                  onCopy={copyToClipboard}
                  setSources={setSources}
                  setSourcesOpen={setSourcesOpen}
                  onRegenerate={() => handleRegenerate(index)}
                  onEdit={(newContent: string) => handleEdit(index, newContent)}
                />
              );
            }}
          </VList>
        </div>
      </div>

      <div className="relative w-full py-3 sm:px-0 px-3 z-50 mt-auto">
        <div className="max-w-4xl w-full mx-auto">
          <ChatInput
            query={searchInput}
            setQuery={setQuery}
            send={handleSend}
            isPending={isPending}
            handleFileChange={handleFileChange}
            stop={handleStop}
          />
        </div>
      </div>

      <SourcesSidebar
        isOpen={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        sources={sources}
      />
    </div>
  );
};

export default Chats;
