import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { VList, VListHandle } from 'virtua';
import InputBox from "./InputBox";
import SourcesSidebar from "./panels/SourcesPanel";
import { ChatsProps } from "@/app/types";
import Message from "./Messages";

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
    handleEdit
}: ChatsProps) => {

    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [sources, setSources] = useState<any[]>([]);

    const vlistRef = useRef<VListHandle>(null);
    const atBottomRef = useRef(true);

    const handleScroll = (offset: number) => {
        if (!vlistRef.current) return;
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
            try { await navigator.clipboard.writeText(text); }
            catch (err) { console.error('Failed to copy:', err); }
        }
    };

    return (
        <>
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
                        shift={true}
                        className="scrollbar-none overflow-x-hidden h-full w-full py-4"
                    >
                        {(q, index) => {
                            const uniqueKey = q.id
                                ? q.id
                                : `msg-${q.created_at || 'local'}-${q.sender}-${index}`;

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

            <div className="fixed bottom-0 left-0 w-full py-4 z-50">
                <div className="max-w-4xl w-full mx-auto">
                    <InputBox
                        query={searchInput} setQuery={setQuery} send={handleSend}
                        isPending={isPending}
                        handleFileChange={handleFileChange} stop={handleStop}
                    />
                </div>
            </div>

            <SourcesSidebar
                isOpen={sourcesOpen}
                onClose={() => setSourcesOpen(false)}
                sources={sources}
            />
        </>
    );
};

export default Chats;