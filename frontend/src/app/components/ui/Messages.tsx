import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";
import { ChevronDown, Copy, FileText, ImageIcon, Link, RefreshCw, Pencil, Check, X } from "lucide-react";
import remarkGfm from "remark-gfm";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { query } from "@/app/types";

interface MessageProps {
    q: query;
    isLastItem: boolean;
    isPending: boolean;
    onCopy: (text: string) => void;
    setSources: (sources: any) => void;
    setSourcesOpen: (open: boolean) => void;
    onRegenerate: () => void;
    onEdit: (newContent: string) => void;
}

const Message = ({ q, isLastItem, isPending, onCopy, setSources, setSourcesOpen, onRegenerate, onEdit }: MessageProps) => {
    const isStreaming = isPending && isLastItem && q.sender === "llm";

    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false); // 🌟 Added copy state
    const editRef = useRef<HTMLParagraphElement>(null);

    // Focus and move cursor to the end of the text when edit mode opens
    useEffect(() => {
        if (isEditing && editRef.current) {
            editRef.current.focus();
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(editRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        } else if (!isEditing && editRef.current) {
            editRef.current.innerText = q.content || "";
        }
    }, [isEditing, q.content]);

    if (!q.content && !isStreaming && (!q.files || q.files.length === 0)) {
        return <div className="h-0" />;
    }

    const handleSaveEdit = () => {
        if (!editRef.current) return;
        const newText = editRef.current.innerText.trim();

        if (newText && newText !== q.content) {
            onEdit(newText);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    // 🌟 Handle Copy with visual feedback
    const handleCopy = () => {
        if (!q.content) return;
        onCopy(q.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Revert back to copy icon after 2s
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`flex w-full ${q.sender === "user" ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex flex-col gap-1 mb-6 group ${q.sender === "user"
                ? "items-end w-full max-w-[90%] sm:max-w-[85%]"
                : "items-start w-full max-w-full"
                }`}>

                {/* Files badges */}
                {q?.files && q.files.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-1">
                        {q.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-white dark:bg-tertiary dark:border-secondary shadow-sm">
                                <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-primary rounded-lg text-slate-600 dark:text-tertiary">
                                    {file.type.startsWith("image/") ? <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" /> : <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />}
                                </div>
                                <div className="text-[10px] sm:text-xs">
                                    <p className="font-semibold truncate max-w-[100px] sm:max-w-[120px] text-slate-800 dark:text-white">{file.name}</p>
                                    <p className="opacity-60 dark:text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main bubble container */}
                {/* 🌟 FIX 1: Removed w-full, added conditional w-fit for user, w-full for AI */}
                <div className={`flex flex-col gap-1.5 transition-all duration-200 ${q.sender === "user" ? "items-end w-fit max-w-full" : "items-start w-full"}`}>

                    {isEditing && (
                        <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium mr-2 motion-safe:animate-pulse">
                            Editing
                        </span>
                    )}

                    {/* 🌟 FIX 2: Applied w-fit so the box naturally hugs the text */}
                    <div className={`transition-all duration-200 ${q.sender === "user"
                        ? `bg-slate-50 border border-slate-200 dark:bg-tertiary dark:border-secondary dark:text-white shadow-sm rounded-2xl w-fit max-w-full ${isEditing ? 'ring-2 ring-slate-200 dark:ring-slate-600' : ''}`
                        : "bg-transparent rounded-2xl w-full"
                        }`}>

                        {q.sender === "user" ? (
                            <p
                                ref={editRef}
                                contentEditable={isEditing}
                                suppressContentEditableWarning={true}
                                onKeyDown={handleKeyDown}
                                className={`text-base sm:text-[18px] leading-relaxed p-3 sm:p-4 whitespace-pre-wrap outline-none break-words ${isEditing ? "cursor-text" : ""}`}
                            >
                                {q.content}
                            </p>
                        ) : (
                            <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none w-full">
                                {q.thinking && (
                                    <Disclosure as="div" className="">
                                        {({ open }) => (
                                            <div className="rounded-xl overflow-hidden transition-colors space-y-2 mb-2">
                                                <DisclosureButton className="flex w-min items-center justify-between text-sm sm:text-md font-semibold gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none">
                                                    <span>Thought</span>
                                                    <ChevronDown
                                                        size={16}
                                                        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                                                    />
                                                </DisclosureButton>
                                                <DisclosurePanel
                                                    transition
                                                    className="text-sm sm:text-base font-mono whitespace-pre-wrap text-slate-500 dark:text-slate-400 opacity-80 transition duration-200 ease-out data-[closed]:-translate-y-2 data-[closed]:opacity-0"
                                                >
                                                    {q.thinking}
                                                </DisclosurePanel>
                                            </div>
                                        )}
                                    </Disclosure>
                                )}
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {q.content || ""}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Check/X Action Buttons */}
                    {isEditing && (
                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-1.5 sm:p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-secondary dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isPending}
                                className="p-1.5 sm:p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                            >
                                <Check size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>

                {!isStreaming && q.content && !isEditing && (
                    <div className="flex gap-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
                        {q.sender === 'user' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={isPending}
                                className={`text-slate-400 p-1 transition-colors ${isPending ? "opacity-50 cursor-not-allowed" : "hover:text-slate-900 dark:hover:text-white"}`}
                            >
                                <Pencil size={14} className="sm:w-4 sm:h-4" />
                            </button>
                        )}

                        {/* 🌟 FIX 3: Updated Copy Button with Visual Feedback */}
                        <button
                            onClick={handleCopy}
                            className={`p-1 transition-colors ${copied ? "text-green-500 dark:text-green-400" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                        >
                            {copied ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Copy size={14} className="sm:w-4 sm:h-4" />}
                        </button>

                        {q.sender !== 'user' && (
                            <button
                                onClick={onRegenerate}
                                disabled={isPending}
                                className={`text-slate-400 p-1 transition-colors ${isPending
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                <RefreshCw size={14} className="sm:w-4 sm:h-4" />
                            </button>
                        )}
                        {q.sources?.length !== 0 && q.sender !== 'user' && (
                            <button onClick={() => { setSources(q.sources); setSourcesOpen(true) }} className="text-slate-400 flex gap-2 items-center hover:text-slate-900 dark:hover:text-white p-1 transition-colors text-sm sm:text-base">
                                <Link size={14} className="sm:w-4 sm:h-4" /> Sources
                            </button>
                        )}
                    </div>
                )}

                {/* Typing Indicator */}
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

export default Message;