import React, { Dispatch, SetStateAction, useState, useRef, useEffect, useLayoutEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";
import { VList, VListHandle } from 'virtua';
import InputBox from "./InputBox";
import SourcesSidebar from "./panels/SourcesPanel";
import { query } from "@/app/types";
import { ChevronDown, Copy, FileText, ImageIcon, RefreshCw } from "lucide-react";
import remarkGfm from "remark-gfm";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";

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
        const prev = prevQueriesRef.current;
        const isNewMessageAppended =
            queries.length > prev.length &&
            queries[queries.length - 1]?.content !== prev[prev.length - 1]?.content;

        if (isNewMessageAppended && atBottomRef.current) {
            requestAnimationFrame(() => {
                vlistRef.current?.scrollToIndex(queries.length - 1, { align: "end" });
            });
        }
        prevQueriesRef.current = queries;
    }, [queries]);

    const copyToClipboard = async (text?: string) => {
        if (text) {
            try { await navigator.clipboard.writeText(text); }
            catch (err) { console.error('Failed to copy:', err); }
        }
    };

    return (
        <>
            <style>{`
                .hide-virtua-scrollbar::-webkit-scrollbar {
                    display: none !important;
                    width: 0px !important;
                    background: transparent !important;
                }
                .hide-virtua-scrollbar {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
            `}</style>
            <div className="flex flex-col items-center w-full h-[calc(100vh-140px)] relative">
                {/* Added overflow-hidden to the wrapper to clip any awkward layout bursts */}
                <div className="w-full max-w-6xl h-full relative overflow-hidden">

                    <VList
                        ref={vlistRef}
                        data={queries}
                        onScroll={handleScroll}
                        shift={queries.length > prevQueriesRef.current.length && queries[0]?.content !== prevQueriesRef.current[0]?.content}
                        // Enforced standard cross-browser scrollbar hiding and prevented horizontal flashing
                        className="hide-virtua-scrollbar h-full w-full py-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        style={{ overflowX: "hidden" }}
                    >
                        {(q, index) => {
                            const isLastItem = index === queries.length - 1;
                            const isStreaming = isPending && isLastItem && q.sender === "llm";
                            if (!q.content && !isStreaming && (!q.files || q.files.length === 0)) {
                                return <div key={index} className="h-0" />;
                            }

                            return (
                                <motion.div
                                    key={`${index}-${q.content?.length}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
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
                                                    {
                                                        q.sender === "llm" && q.thinking && (
                                                            <Disclosure as="div" className="">
                                                                {({ open }) => (
                                                                    <div className="rounded-xl overflow-hidden transition-colors space-y-2">
                                                                        <DisclosureButton className="flex w-min items-center justify-between text-md font-semibold gap-1 text-slate-500 hover:text-slate-100 transition-colors select-none">
                                                                            <span>Thought</span>
                                                                            <ChevronDown
                                                                                size={16}
                                                                                className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                                                                            />
                                                                        </DisclosureButton>
                                                                        <DisclosurePanel
                                                                            transition
                                                                            className="text-base font-mono whitespace-pre-wrap text-slate-200 opacity-80 transition duration-200 ease-out data-[closed]:-translate-y-2 data-[closed]:opacity-0"
                                                                        >
                                                                            {q.thinking}
                                                                        </DisclosurePanel>
                                                                    </div>
                                                                )}
                                                            </Disclosure>
                                                        )
                                                    }
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            h1: ({ children }) => (
                                                                <h1 className="text-3xl font-semibold mb-4 text-slate-900 dark:text-zinc-100">
                                                                    {children}
                                                                </h1>
                                                            ),
                                                            h2: ({ children }) => (
                                                                <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-zinc-100">
                                                                    {children}
                                                                </h2>
                                                            ),
                                                            h3: ({ children }) => (
                                                                <h3 className="text-xl font-semibold mt-5 mb-3 text-slate-900 dark:text-zinc-100">
                                                                    {children}
                                                                </h3>
                                                            ),
                                                            p: ({ children }) => (
                                                                <p className="text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200 mb-4">
                                                                    {children}
                                                                </p>
                                                            ),
                                                            ul: ({ children }) => (
                                                                <ul className="ml-6 mb-4 list-disc space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">
                                                                    {children}
                                                                </ul>
                                                            ),
                                                            ol: ({ children }) => (
                                                                <ol className="ml-6 mb-4 list-decimal space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">
                                                                    {children}
                                                                </ol>
                                                            ),
                                                            li: ({ children }) => <li>{children}</li>,
                                                            blockquote: ({ children }) => (
                                                                <blockquote className="border-l-2 pl-4 my-5 italic text-[18px] leading-[1.8]
                                                                border-slate-300 text-slate-500 
                                                                dark:border-zinc-600 dark:text-zinc-400"
                                                                >
                                                                    {children}
                                                                </blockquote>
                                                            ),
                                                            code: ({ children }) =>
                                                            (
                                                                <pre className="rounded-xl p-5 my-5 overflow-x-auto border
                                                                    bg-slate-50 border-slate-200 
                                                                    dark:bg-zinc-900 dark:border-transparent"
                                                                >
                                                                    <code className="text-[15px] leading-7 text-slate-800 dark:text-zinc-200">
                                                                        {children}
                                                                    </code>
                                                                </pre>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className="font-semibold text-slate-900 dark:text-zinc-50">{children}</strong>
                                                            )
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
                                </motion.div>
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