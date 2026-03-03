import React, { Dispatch, SetStateAction, useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { VList, VListHandle } from 'virtua';
import InputBox from "./InputBox";
import SourcesSidebar from "./panels/SourcesPanel";
import { query } from "@/app/types";
import Message from "./Messages";

interface ChatsProps {
    queries: query[];
    setQueries: Dispatch<SetStateAction<query[]>>;
    isPending: boolean;
    handleSend: (query: string, files: File[], modal: string) => Promise<void>;
    query: string;
    setQuery: (value: string) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleStop: () => void;
    files: File[];
    setFiles: (files: File[]) => void;
    loadOlderChats: () => Promise<void>;
    isLoadingOlder: boolean;
    hasMore: boolean;
    handleRegenerate: (index: number) => Promise<void>;
    handleEdit: (index: number, newContent: string) => Promise<void>;
}

const Chats = ({
    queries,
    isPending,
    handleSend,
    query: searchInput,
    setQuery,
    files,
    handleFileChange,
    handleStop,
    setFiles,
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
    const prevQueriesRef = useRef<query[]>(queries);
    const initialScrollDone = useRef(false);

    useLayoutEffect(() => {
        if (!initialScrollDone.current && queries.length > 0 && vlistRef.current) {
            vlistRef.current.scrollToIndex(queries.length - 1, { align: 'end' });
            initialScrollDone.current = true;
        }
    }, [queries.length]);

    const handleScroll = (offset: number) => {
        if (!vlistRef.current) return;

        if (offset < 10 && hasMore && !isLoadingOlder) {
            loadOlderChats();
        }

        const scrollSize = vlistRef.current.scrollSize;
        const viewportSize = vlistRef.current.viewportSize;
        atBottomRef.current = scrollSize - (offset + viewportSize) < 100;
    };

    // 🌟 STRICT SCROLL LOGIC
    useEffect(() => {
        if (!vlistRef.current || queries.length === 0) return;

        const prev = prevQueriesRef.current;

        const isNewMessageAppended =
            queries.length > prev.length &&
            (prev.length === 0 || queries[queries.length - 1] !== prev[prev.length - 1]);

        if (isNewMessageAppended || (isPending && atBottomRef.current)) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    vlistRef.current?.scrollToIndex(queries.length - 1, { align: "end" });
                }, 15);
            });
        }

        prevQueriesRef.current = queries;
    }, [queries, isPending]);

    const copyToClipboard = async (text?: string) => {
        if (text) {
            try { await navigator.clipboard.writeText(text); }
            catch (err) { console.error('Failed to copy:', err); }
        }
    };

    return (
        <>
            {/* 🌟 FIX 1: Changed `vh` to `dvh` for mobile browsers, and added horizontal padding (px-3 sm:px-6) */}
            <div className="flex flex-col items-center w-full h-[calc(100dvh-140px)] relative px-3 sm:px-6">
                <div className="w-full max-w-6xl h-full relative">
                    <VList
                        ref={vlistRef}
                        data={queries}
                        onScroll={handleScroll}
                        shift={queries.length > prevQueriesRef.current.length && queries[0]?.content !== prevQueriesRef.current[0]?.content}
                        // 🌟 FIX 2: Removed fixed pr-4 on mobile so content doesn't get pushed off-center
                        className="scrollbar-none sm:pr-4 overflow-hidden h-full w-full py-4"
                    >
                        {(q, index) => (
                            <Message
                                key={`${index}-${q.content?.length}`}
                                q={q}
                                isLastItem={index === queries.length - 1}
                                isPending={isPending}
                                onCopy={copyToClipboard}
                                setSources={setSources}
                                setSourcesOpen={setSourcesOpen}
                                onRegenerate={() => handleRegenerate(index)}
                                onEdit={(newContent: string) => handleEdit(index, newContent)}
                            />
                        )}
                    </VList>

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
                </div>
            </div>

            {/* 🌟 FIX 3: Added w-full and padding to match the chat area above */}
            <div className="fixed bottom-0 left-0 w-full pb-4 sm:pb-4 pt-2 z-50">
                <div className="max-w-6xl w-full mx-auto px-3 sm:px-6">
                    <InputBox
                        query={searchInput} setQuery={setQuery} send={handleSend}
                        isPending={isPending} files={files}
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