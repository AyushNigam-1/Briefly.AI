"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { Search, X, MessageSquare, User, Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SearchModalProps, SearchResult } from "@/app/types";
import api from "@/app/lib/api";

const SearchModal: React.FC<SearchModalProps> = ({ onCloseSidebar }) => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchModalOpen, setSearchModalOpen] = useState(false);

    // 🌟 Debounce the API call
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const fetchSearchResults = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get(
                    `chats/search?q=${encodeURIComponent(searchQuery.trim())}`,
                );
                setResults(res.data.results || []);
            } catch (err) {
                console.error("Search failed", err);
                setError("Failed to fetch search results.");
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchSearchResults();
        }, 400);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleClose = () => {
        setSearchQuery("");
        setResults([]);
        setSearchModalOpen(false);
    };

    const handleResultClick = (chatId: string) => {
        router.push(`/?id=${chatId}`);
        handleClose();
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <>
            <button
                onClick={() => { setSearchModalOpen(true); onCloseSidebar() }}
                className="p-3 flex items-center w-full justify-center gap-2 font-bold text-sm md:text-base rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
            >
                <Search size={18} /> Search Chat
            </button>

            <Dialog
                open={searchModalOpen}
                onClose={handleClose}
                className="relative z-50 font-sans"
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0 bg-black/40 dark:bg-black/60"
                />

                <div className="fixed inset-0 overflow-y-auto scrollbar-none">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">

                        <DialogPanel
                            transition
                            className="w-full max-w-2xl h-[60vh] min-h-[450px] flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:-translate-y-4 bg-white border-slate-200 text-left align-middle dark:bg-tertiary dark:border-white/10"
                        >
                            <div className="relative flex shrink-0 items-center p-4 border-b border-slate-200 dark:border-white/10 z-20">
                                <Search className="absolute left-5 text-slate-400 dark:text-gray-500" size={20} strokeWidth={2} />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent pl-10 pr-10 text-lg sm:text-xl font-medium outline-none text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <X size={18} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {!searchQuery.trim() ? (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-gray-500 gap-4"
                                        >
                                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-full">
                                                <Search size={32} className="opacity-50" />
                                            </div>
                                            <p className="text-sm font-medium">Type to search across all your chats...</p>
                                        </motion.div>
                                    ) : isLoading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-gray-500 gap-3"
                                        >
                                            <Loader2 size={28} className="animate-spin opacity-60" />
                                        </motion.div>
                                    ) : results.length === 0 && !error ? (
                                        <motion.div
                                            key="no-results"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-gray-500 gap-3"
                                        >
                                            <MessageSquare size={32} className="opacity-30 mb-2" />
                                            <p className="text-sm">No messages found for "{searchQuery}"</p>
                                        </motion.div>
                                    ) : error ? (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-500 dark:text-red-400 text-sm font-medium"
                                        >
                                            {error}
                                        </motion.div>
                                    )

                                        /* 5. Results State */
                                        : (
                                            <motion.div
                                                key="results"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.25 }}
                                                className="absolute inset-0 overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10"
                                            >
                                                {results.map((chat) => (
                                                    <div key={chat.id} className="mb-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm shrink-0">

                                                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                                            <MessageSquare size={14} className="text-slate-400 dark:text-gray-500 shrink-0" />
                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 truncate flex-1">
                                                                {chat.title}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-slate-400 dark:text-gray-500 shrink-0 ml-2">
                                                                {formatDate(chat.timestamp)}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col">
                                                            {chat.messages.map((msg, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => handleResultClick(chat.id)}
                                                                    className="group flex items-start gap-3 p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04] border-b last:border-0 border-slate-100 dark:border-white/5"
                                                                >
                                                                    <div className="mt-0.5 text-slate-400 dark:text-gray-500 shrink-0">
                                                                        {msg.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm text-slate-700 dark:text-gray-200 line-clamp-2 leading-relaxed">
                                                                            {msg.content}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                </AnimatePresence>
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default SearchModal;