import React, { Dispatch, SetStateAction, useState, useRef, useEffect, useLayoutEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";
import { VList, VListHandle } from 'virtua';
import InputBox from "./InputBox";
import SourcesSidebar from "./panels/SourcesPanel";
import { query } from "@/app/types";
import { Copy, FileText, ImageIcon, RefreshCw } from "lucide-react";
import remarkGfm from "remark-gfm";

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
}: ChatsProps) => {
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [sources] = useState<any[]>([]);

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

        // Logic for loading older chats when reaching top
        if (offset < 10 && hasMore && !isLoadingOlder) {
            loadOlderChats();
        }

        const scrollSize = vlistRef.current.scrollSize;
        const viewportSize = vlistRef.current.viewportSize;
        // Stick to bottom if we are within 100px of the end
        atBottomRef.current = scrollSize - (offset + viewportSize) < 100;
    };

    useEffect(() => {
        // Auto-scroll when new messages arrive or while streaming, but only if user is already at bottom
        if (queries.length > prevQueriesRef.current.length || isPending) {
            if (atBottomRef.current) {
                // 'smooth' can be used here for new messages, but 'instant' is better for streaming
                vlistRef.current?.scrollToIndex(queries.length - 1, { align: 'end' });
            }
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
            <div className="flex flex-col items-center w-full h-[calc(100vh-140px)] relative">
                <div className="w-full max-w-6xl h-full relative">
                    <VList
                        ref={vlistRef}
                        data={queries}
                        onScroll={handleScroll}
                        shift={queries.length > prevQueriesRef.current.length && queries[0]?.content !== prevQueriesRef.current[0]?.content}
                        className="scrollbar-none h-full w-full py-4"
                    >
                        {(q, index) => {
                            const isLastItem = index === queries.length - 1;
                            const isStreaming = isPending && isLastItem && q.sender === "llm";
                            if (!q.content && !isStreaming && (!q.files || q.files.length === 0)) {
                                return <div key={index} className="h-0" />;
                            }

                            return (
                                <div
                                    key={index}
                                    className={`flex w-full ${q.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex flex-col gap-1 max-w-[85%] group ${q.sender === "user" ? "items-end" : "items-start"}`}>

                                        {/* Files badges */}
                                        {q?.files && q.files.length > 0 && (
                                            <div className="flex gap-2 flex-wrap mb-1">
                                                {q.files.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-white dark:bg-tertiary dark:border-secondary shadow-sm">
                                                        <div className="p-2 bg-slate-100 dark:bg-primary rounded-lg text-slate-600 dark:text-tertiary">
                                                            {file.type.startsWith("image/") ? <ImageIcon size={18} /> : <FileText size={18} />}
                                                        </div>
                                                        <div className="text-xs">
                                                            <p className="font-semibold truncate max-w-[120px] text-slate-800 dark:text-white">{file.name}</p>
                                                            <p className="opacity-60 dark:text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className={` rounded-2xl transition-all duration-200 ${q.sender === "user"
                                            ? "bg-slate-50 border border-slate-200 dark:bg-tertiary dark:border-secondary dark:text-white shadow-sm"
                                            : "bg-transparent"
                                            }`}>
                                            {q.sender === "user" ? (
                                                <p className="text-[18px] leading-relaxed p-4">{q.content}</p>
                                            ) : (
                                                <div className="prose dark:prose-invert max-w-none">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ children }) => <p className="mb-4 last:mb-0 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">{children}</p>
                                                        }}
                                                    >
                                                        {q.content || ""}
                                                    </ReactMarkdown>


                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Actions */}
                                        {!isStreaming && q.content && (
                                            <div className="flex gap-4 group-hover:opacity-100 transition-opacity duration-200">
                                                <button onClick={() => copyToClipboard(q.content)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                                                    <Copy size={16} />
                                                </button>
                                                {q.sender !== 'user' && (
                                                    <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                )}
                                            </div>)}
                                        {isStreaming && (
                                            <div className="flex gap-1.5 mt-4">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
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

            <div className="max-w-6xl mx-auto">
                <InputBox
                    query={searchInput} setQuery={setQuery} send={handleSend}
                    isPending={isPending} files={files}
                    handleFileChange={handleFileChange} stop={handleStop}
                />
            </div>

            <SourcesSidebar isOpen={sourcesOpen} onClose={() => setSourcesOpen(false)} sources={sources} />
        </>
    );
};

export default Chats;