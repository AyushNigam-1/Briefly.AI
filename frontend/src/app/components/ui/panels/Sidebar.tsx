"use client"

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
} from "@headlessui/react";
import {
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    Ghost,
    MessageSquareDashed,
    Pin,
    Plus,
    Search,
    Share2,
    Trash
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SummaryHistoryResponse } from "@/app/types";
import TaskManagerModal from "../modals/Tasks";
import ShareModal from "../modals/ShareModal";
import DeleteChatDialog from "../modals/DeleteChatModal";

const groupSummariesByDate = (summaries: SummaryHistoryResponse[]) => {
    const grouped = {
        Today: [],
        Yesterday: [],
        "Previous 7 Days": [],
        "Previous 30 Days": [],
        Older: [],
    } as Record<string, SummaryHistoryResponse[]>;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOf7 = new Date(startOfToday.getTime() - 7 * 86400000);
    const startOf30 = new Date(startOfToday.getTime() - 30 * 86400000);

    summaries
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .forEach((s) => {
            const d = new Date(s.timestamp);
            if (d >= startOfToday) grouped.Today.push(s);
            else if (d >= startOfYesterday) grouped.Yesterday.push(s);
            else if (d >= startOf7) grouped["Previous 7 Days"].push(s);
            else if (d >= startOf30) grouped["Previous 30 Days"].push(s);
            else grouped.Older.push(s);
        });

    return grouped;
};

const Sidebar: React.FC = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false); // 🌟 Added to prevent Next.js hydration errors
    const [isOpen, setIsOpen] = useState(false);
    const [chats, setChats] = useState<SummaryHistoryResponse[]>([]);
    const [filtered, setFiltered] = useState<SummaryHistoryResponse[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [summaryId, setSummaryId] = useState<string>();
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareChatInfo, setShareChatInfo] = useState({ id: "", title: "" });
    const params = useParams();
    const activeId = params?.id;

    // 🌟 Read the token
    const token = Cookies.get('access_token');

    // 🌟 Set mounted to true once the component renders on the client
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

    const fetchUserSummaries = async () => {
        if (!token) {
            setLoading(false);
            return; // 🌟 Prevent API call if no token exists
        }

        try {
            const res = await axios.get("http://10.207.18.43:8000/chats/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            setChats(res.data.chats || []);
        } catch {
            setError("Failed to load summaries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted && token) {
            fetchUserSummaries();
        } else if (mounted && !token) {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, token]);

    useEffect(() => {
        setFiltered(
            chats.filter((s) =>
                s.title.toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, chats]);

    const handleDelete = async () => {
        try {
            await axios.delete(`http://10.207.18.43:8000/summary/?id=${summaryId}`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            const updated = chats.filter((s) => s.id !== summaryId);
            setChats(updated);
        } catch {
            setError("Delete failed");
        }
    };

    const handlePin = async (chatId: string, currentPinStatus: boolean) => {
        try {
            const newPinStatus = !currentPinStatus;
            await axios.patch(`http://10.207.18.43:8000/summary/${chatId}/pin`,
                { is_pinned: newPinStatus },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );
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

    // 🌟 If the component hasn't mounted yet OR there is no token, don't show the sidebar at all!
    if (!mounted || !token) {
        return null;
    }

    const grouped = groupSummariesByDate(filtered);
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

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
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
                            onClick={() => { router.push("/private"); handleMobileNav(); }}
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
                    <button
                        onClick={() => { router.push("/"); handleMobileNav(); }}
                        className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
                    >
                        <Search size={18} /> Search Chat
                    </button>
                    <TaskManagerModal />

                    <div className="overflow-y-auto min-h-0 flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5 pr-2">
                        {loading && <p className="text-slate-500 dark:text-gray-400">Loading…</p>}
                        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}

                        <div className="space-y-4 overflow-y-auto">
                            {Object.keys(grouped).map((k) =>
                                grouped[k].length ? (
                                    <div key={k} className="space-y-2">
                                        <h3 className="font-bold text-sm tracking-wide text-slate-500 dark:text-gray-200">{k}</h3>
                                        <div className="space-y-1">
                                            {grouped[k].map((s) => (

                                                <div
                                                    key={s.id}
                                                    className={`group relative overflow-hidden flex items-center justify-between transition-colors rounded-xl pr-2
                                                    ${activeId == s.id
                                                            ? "font-medium bg-slate-100 border border-slate-200 text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-white"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-gray-400 border border-transparent dark:hover:text-white dark:hover:bg-white/5"
                                                        }`}
                                                >
                                                    <Link
                                                        href={`/${s.id}`}
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
                                                </div>

                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            )}
                        </div>
                    </div>


                </div>
            </div>
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