import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Copy, FileText, ImageIcon, Link, RefreshCw, Pencil, Check, X, Volume2, Pause, Loader2, Image, Video } from "lucide-react";
import remarkGfm from "remark-gfm";
import { Disclosure, DisclosureButton } from "@headlessui/react";
import { MessageProps } from "@/app/types";

const MessageList = ({ q, isLastItem, isPending, onCopy, setSources, setSourcesOpen, onRegenerate, onEdit }: MessageProps) => {
    const isStreaming = isPending && isLastItem && q.sender === "llm";

    const showLoader = isStreaming && !q.thinking && !q.content;
    const isThinkingActive = isStreaming && Boolean(q.thinking) && !q.content;

    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const editRef = useRef<HTMLParagraphElement>(null);

    // Voice state and refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);

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

    // Cleanup audio when component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                if (audioRef.current.src) {
                    URL.revokeObjectURL(audioRef.current.src);
                }
            }
        };
    }, []);

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

    const handleCopy = () => {
        if (!q.content) return;
        onCopy(q.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Voice functionality
    const handleToggleAudio = async () => {
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        if (audioRef.current && audioRef.current.src) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        if (!q.content) return;
        setIsAudioLoading(true);

        try {
            const response = await fetch("http://localhost:8000/generate-voice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: q.content, voice: "troy" })
            });

            if (!response.ok) throw new Error("Failed to fetch audio");

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setIsPlaying(false);
            };

            audio.play();
            setIsPlaying(true);
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            setIsAudioLoading(false);
        }
    };

    const shouldAnimate = !isStreaming;

    const getInitialAnimation = () => {
        if (!shouldAnimate) return false;
        return { opacity: 0, y: 15 };
    };

    return (
        <motion.div
            initial={getInitialAnimation()}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex w-full ${q.sender === "user" ? "justify-end" : "justify-start"}`}
        >
            <div className={`relative flex flex-col gap-1 p-3 md:py-3 md:p-0 group ${q.sender === "user" ? "items-end w-full max-w-[90%] sm:max-w-[85%]" : "items-start w-full max-w-full"}`}>

                {q?.files && q.files.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-1">
                        {q.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-white dark:bg-tertiary dark:border-secondary shadow-sm">
                                <div className="p-2 sm:p-3 rounded-full my-auto transition-colors flex items-center justify-center bg-slate-200 text-slate-700 dark:text-gray-200 dark:bg-secondary">
                                    {file.type.startsWith('image/') ? (
                                        <Image size={16} className="sm:w-5 sm:h-5" />
                                    ) : file.type.startsWith('video/') ? (
                                        <Video size={16} className="sm:w-5 sm:h-5" />
                                    ) : (
                                        <FileText size={16} className="sm:w-5 sm:h-5" />
                                    )}
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold truncate max-w-[100px] sm:max-w-[120px] text-slate-800 dark:text-white">{file.name}</p>
                                    <p className="opacity-60 dark:text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`flex flex-col gap-1.5 transition-all duration-200 ${q.sender === "user" ? "items-end w-fit max-w-full" : "items-start w-full"}`}>
                    <div className={`transition-all duration-200 ${q.sender === "user" ? "bg-slate-50 border border-slate-200 dark:bg-tertiary dark:border-secondary dark:text-white shadow-sm rounded-2xl w-fit max-w-full" : "bg-transparent rounded-2xl w-full"}`}>
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
                                            <div className="rounded-xl transition-colors space-y-2 mb-2">
                                                <DisclosureButton className="flex w-min items-center justify-between text-sm sm:text-md font-semibold gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none">
                                                    <span className={isThinkingActive ? "animate-pulse text-slate-800 dark:text-slate-200" : ""}>
                                                        {isThinkingActive && q.thinking?.includes("Analyzing")
                                                            ? "Analyzing..."
                                                            : isThinkingActive
                                                                ? "Thinking..."
                                                                : "Thought"}
                                                    </span>
                                                    <ChevronDown
                                                        size={16}
                                                        className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                                                    />
                                                </DisclosureButton>

                                                <AnimatePresence initial={false}>
                                                    {open && (
                                                        <motion.div
                                                            key="thinking-panel"
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{
                                                                height: { duration: 0.3, ease: "easeInOut" },
                                                                opacity: { duration: 0.2, ease: "easeInOut" }
                                                            }}
                                                            style={{ overflow: "hidden" }}
                                                        >
                                                            <div className="text-sm sm:text-base font-mono whitespace-pre-wrap text-slate-500 dark:text-slate-400 opacity-80">
                                                                {q.thinking}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
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
                </div>

                <AnimatePresence>
                    {isEditing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute bottom-3 flex justify-end gap-3 z-10"
                        >
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isPending}
                                className="p-1 text-slate-400 hover:text-green-500 dark:text-slate-500 dark:hover:text-green-400 disabled:opacity-40 transition-colors"
                            >
                                <Check size={18} strokeWidth={2.5} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isStreaming && q.content && (
                    <div className={`flex gap-4 mt-1 transition-opacity duration-200 ${isEditing ? "opacity-0 pointer-events-none" : "opacity-100 md:opacity-0 group-hover:opacity-100"}`}>
                        {q.sender === 'user' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={isPending}
                                className={`text-slate-400 p-1 transition-colors ${isPending ? "opacity-50 cursor-not-allowed" : "hover:text-slate-900 dark:hover:text-white"}`}
                            >
                                <Pencil size={14} className="sm:w-4 sm:h-4" />
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className={`p-1 transition-colors ${copied ? "text-green-500 dark:text-green-400" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                        >
                            {copied ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Copy size={14} className="sm:w-4 sm:h-4" />}
                        </button>

                        {q.sender !== 'user' && (
                            <>
                                <button
                                    onClick={onRegenerate}
                                    disabled={isPending}
                                    className={`text-slate-400 p-1 transition-colors ${isPending ? "opacity-50 cursor-not-allowed" : "hover:text-slate-900 dark:hover:text-white"}`}
                                >
                                    <RefreshCw size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    onClick={handleToggleAudio}
                                    disabled={isPending || isAudioLoading}
                                    className={`p-1 transition-colors text-slate-400 ${isAudioLoading || isPending ? "opacity-50 cursor-not-allowed" : " hover:text-slate-900 dark:hover:text-white"}`}
                                >
                                    {
                                        isAudioLoading ? (
                                            <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                                        ) : isPlaying ? (
                                            <Pause size={14} className="sm:w-4 sm:h-4" />
                                        ) : (
                                            <Volume2 size={14} className="sm:w-4 sm:h-4" />
                                        )}
                                </button>
                            </>
                        )}
                        {q.sources?.length !== 0 && q.sender !== 'user' && (
                            <button onClick={() => { setSources(q.sources); setSourcesOpen(true) }} className="text-slate-400 flex gap-2 items-center hover:text-slate-900 dark:hover:text-white p-1 transition-colors text-sm sm:text-base">
                                <Link size={14} className="sm:w-4 sm:h-4" /> Sources
                            </button>
                        )}
                    </div>
                )}

                {showLoader && (
                    <div className="flex gap-1.5 mt-4 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                )}
            </div>
        </motion.div >
    );
};

export default MessageList;