import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown, Copy, FileText, ImageIcon, RefreshCw } from "lucide-react";
import { query } from "@/app/types";

interface MessageBubbleProps {
    message: query;
    isLastItem: boolean;
    isPending: boolean;
    onCopy: (text?: string) => void;
}

const Messages: React.FC<MessageBubbleProps> = ({ message, isLastItem, isPending, onCopy }) => {
    const isStreaming = isPending && isLastItem && message.sender === "llm";

    if (!message.content && !isStreaming && (!message.files || message.files.length === 0)) {
        return <div className="h-0" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`flex w-full ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex flex-col gap-1 max-w-[85%] group ${message.sender === "user" ? "items-end" : "items-start"}`}>

                {/* Files badges */}
                {message?.files && message.files.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-1">
                        {message.files.map((file, idx) => (
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

                <div className={` rounded-2xl transition-all duration-200 ${message.sender === "user"
                    ? "bg-slate-50 border border-slate-200 dark:bg-tertiary dark:border-secondary dark:text-white shadow-sm"
                    : "bg-transparent"
                    }`}>
                    {message.sender === "user" ? (
                        <p className="text-[18px] leading-relaxed p-4">{message.content}</p>
                    ) : (
                        <div className="prose dark:prose-invert max-w-none">
                            {message.sender === "llm" && message.thinking && (
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
                                                {message.thinking}
                                            </DisclosurePanel>
                                        </div>
                                    )}
                                </Disclosure>
                            )}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="text-3xl font-semibold mb-4 text-slate-900 dark:text-zinc-100">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-zinc-100">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-xl font-semibold mt-5 mb-3 text-slate-900 dark:text-zinc-100">{children}</h3>,
                                    p: ({ children }) => <p className="text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200 mb-4">{children}</p>,
                                    ul: ({ children }) => <ul className="ml-6 mb-4 list-disc space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">{children}</ul>,
                                    ol: ({ children }) => <ol className="ml-6 mb-4 list-decimal space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">{children}</ol>,
                                    li: ({ children }) => <li>{children}</li>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 pl-4 my-5 italic text-[18px] leading-[1.8] border-slate-300 text-slate-500 dark:border-zinc-600 dark:text-zinc-400">
                                            {children}
                                        </blockquote>
                                    ),
                                    code: ({ children }) => (
                                        <pre className="rounded-xl p-5 my-5 overflow-x-auto border bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-transparent">
                                            <code className="text-[15px] leading-7 text-slate-800 dark:text-zinc-200">
                                                {children}
                                            </code>
                                        </pre>
                                    ),
                                    strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-zinc-50">{children}</strong>
                                }}
                            >
                                {message.content || ""}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                {!isStreaming && message.content && (
                    <div className="flex gap-4 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => onCopy(message.content)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                            <Copy size={16} />
                        </button>
                        {message.sender !== 'user' && (
                            <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
                )}
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
};

export default Messages;