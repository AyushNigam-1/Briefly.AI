"use client"

import { useState, useEffect, useRef } from "react";
import api from "@/app/lib/api";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronLeft, ChevronRight, EllipsisVertical, Ghost, Pin, Plus, Share2, Trash, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryHistoryResponse } from "@/app/types";
import TaskManagerModal from "../modals/Tasks";
import ShareModal from "../modals/ShareModal";
import DeleteChatDialog from "../modals/DeleteChatModal";
import SearchModal from "../modals/SearchChatModal";

const Sidebar = ({ user, isLoading }: { user: any, isLoading: boolean }) => {

    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [chats, setChats] = useState<SummaryHistoryResponse[]>([]);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [summaryId, setSummaryId] = useState<string>();
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareChatInfo, setShareChatInfo] = useState({ id: "", title: "" });
    const activeId = searchParams.get('id');

    const fetchInitiated = useRef(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleSidebar = () => { setIsOpen((v) => !v); };

    const handleMobileNav = () => {
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleChatTitled = (event: any) => {
            const { id, title } = event.detail;
            setChats(prev => {
                const exists = prev.find(c => c.id === id);
                if (exists) {
                    return prev.map(c => c.id === id ? { ...c, title } : c);
                } else {
                    router.push(`/?id=${id}`);
                    return [
                        {
                            id,
                            title,
                            is_pinned: false,
                            timestamp: new Date().toISOString(),
                            url: "",
                            queries: 0,
                            type: "chat",
                            thumbnail: ""
                        },
                        ...prev
                    ];
                }
            });
        };
        window.addEventListener("chat-title", handleChatTitled);
        return () => window.removeEventListener("chat-title", handleChatTitled);
    }, [router]);

    const fetchUserSummaries = async (currentSkip = 0, isAppending = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        if (isAppending) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await api.get(`/chats/?skip=${currentSkip}&limit=15`);

            const fetchedChats = res.data.chats || [];

            if (fetchedChats.length < 10) {
                setHasMore(false);
            }

            if (isAppending) {
                setChats(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newUniqueChats = fetchedChats.filter((c: SummaryHistoryResponse) => !existingIds.has(c.id));
                    return [...prev, ...newUniqueChats];
                });
            } else {
                setChats(fetchedChats);
            }
        } catch {
            setError("Failed to load summaries");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!user) {
            fetchInitiated.current = false;
        }
        if (mounted && user?.id && !fetchInitiated.current) {
            fetchInitiated.current = true;
            fetchUserSummaries(0, false);
        } else if (mounted && !user?.id) {
            setLoading(false);
        }
    }, [mounted, user?.id]);

    const filtered = chats.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loadingMore && !loading) {
            const newSkip = skip + 15;
            setSkip(newSkip);
            fetchUserSummaries(newSkip, true);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/summary/?id=${summaryId}`);
            const updated = chats.filter((s) => s.id !== summaryId);
            setChats(updated);
        } catch {
            setError("Delete failed");
        }
    };

    const handlePin = async (chatId: string, currentPinStatus: boolean) => {
        try {
            const newPinStatus = !currentPinStatus;
            await api.patch(`/summary/${chatId}/pin`, {
                is_pinned: newPinStatus,
            });
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === chatId ? { ...chat, is_pinned: newPinStatus } : chat
                )
            );
        } catch (err) {
            console.error("Failed to pin chat", err);
            setError("Failed to pin chat");
        }
    };

    if (!user) {
        return null;
    }

    const pinnedChats = filtered.filter(c => c.is_pinned);
    const recentChats = filtered.filter(c => !c.is_pinned);

    const options = (chat: any) => [
        {
            label: chat.is_pinned ? "Unpin" : "Pin",
            icon: (<Pin size={20} className={chat.is_pinned ? "fill-slate-800 dark:fill-white" : ""} />),
            action: (e: React.MouseEvent) => {
                e.preventDefault();
                handlePin(chat.id, chat.is_pinned || false);
            }
        },
        {
            label: "Share",
            icon: (<Share2 size={20} />),
            action: (e: React.MouseEvent) => {
                e.preventDefault();
                setShareChatInfo({ id: chat.id, title: chat.title });
                setShareModalOpen(true);
            }
        },
        {
            label: 'Delete',
            icon: (<Trash size={20} />),
            action: (e: React.MouseEvent) => {
                e.preventDefault();
                setSummaryId(chat.id);
                setDialogOpen(true);
            }
        }
    ];

    const renderChatItem = (s: SummaryHistoryResponse) => (
        <motion.div
            layout
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, marginTop: 0 }}
            transition={{
                duration: 0.35,
                layout: { type: "tween", duration: 0.2, ease: "easeOut" }
            }}
            className={`group relative overflow-hidden flex items-center justify-between transition-colors rounded-xl pr-2 mb-1
            ${activeId == s.id
                    ? "font-medium bg-slate-100 border border-slate-200 text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-gray-400 border border-transparent dark:hover:text-white dark:hover:bg-white/5"
                }`}
        >
            <Link
                href={`/?id=${s.id}`}
                onClick={handleMobileNav}
                className="flex-1 outline-none focus:outline-none p-2 truncate"
            >
                <span className="truncate pr-2">{s.title}</span>
            </Link>

            <Menu as="div" className="flex items-center">
                <MenuButton className="p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200
                    bg-white text-slate-600 hover:bg-slate-200 shadow-sm md:shadow-none
                    dark:bg-tertiary dark:hover:bg-white/5 dark:shadow-none">
                    <EllipsisVertical size={16} />
                </MenuButton>
                <MenuItems
                    transition
                    anchor="right"
                    className="w-44 mx-4 rounded-xl border flex flex-col p-2 z-50 transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 shadow-xl
                        bg-white border-slate-200 text-slate-800
                        dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none"
                >
                    {options(s).map(option => (
                        <MenuItem key={option.label}>
                            <button
                                onClick={option.action}
                                className="group z-50 flex w-full p-2 items-center gap-3 rounded-lg text-base font-bold transition-colors
                                    data-[focus]:bg-slate-100 
                                    dark:data-[focus]:bg-white/5"
                            >
                                {option.icon}
                                {option.label}
                            </button>
                        </MenuItem>
                    ))}
                </MenuItems>
            </Menu>
        </motion.div>
    );

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`fixed top-0 left-0 h-full w-[70vw] md:w-72 border-r font-mono shadow-2xl md:shadow-lg transform transition-transform duration-300 z-50 
                    bg-white border-slate-200 text-slate-800
                    dark:bg-tertiary dark:border-secondary dark:text-white
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <button
                    onClick={toggleSidebar}
                    className="absolute top-1/2 -right-7 md:-right-5 flex h-20 w-7 md:h-16 md:w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:text-slate-800 dark:border-secondary dark:bg-tertiary dark:text-gray-400 dark:hover:text-white focus:outline-none"
                >
                    {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className="p-4 space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Chats</h2>
                        <button
                            onClick={() => {
                                router.push("/?id=private"); handleMobileNav();
                            }}
                            title="Incognito Chat"
                            className="transition-colors hover:text-slate-600 dark:hover:text-gray-300"
                        >
                            <Ghost size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => { router.push("/"); handleMobileNav(); }}
                        className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
                    >
                        <Plus size={18} /> New Chat
                    </button>
                    <SearchModal onCloseSidebar={() => handleMobileNav()} />
                    <TaskManagerModal onCloseSidebar={() => handleMobileNav()} />

                    <div
                        onScroll={handleScroll}
                        className="overflow-y-auto min-h-0 flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5"
                    >
                        {loading && (
                            <div className="flex justify-center items-center py-2">
                                <Loader2 size={24} className="animate-spin text-slate-400" />
                            </div>
                        )}
                        {error && <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>}

                        <div className="space-y-4 overflow-y-auto pb-4">

                            {pinnedChats.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-bold text-sm tracking-wide text-slate-500 dark:text-gray-200">Pinned</h3>
                                    <div className="space-y-1">
                                        <AnimatePresence>
                                            {pinnedChats.map((s) => renderChatItem(s))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {recentChats.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-bold text-sm tracking-wide text-slate-500 dark:text-gray-200">Recent</h3>
                                    <div className="space-y-1">
                                        <AnimatePresence>
                                            {recentChats.map((s) => renderChatItem(s))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {loadingMore && (
                                <div className="flex justify-center">
                                    <Loader2 size={16} className="animate-spin text-slate-500 dark:text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                chatId={shareChatInfo.id}
                chatTitle={shareChatInfo.title}
            />
            <DeleteChatDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default Sidebar;