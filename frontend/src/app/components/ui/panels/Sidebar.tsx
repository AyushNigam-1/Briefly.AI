import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import {
    Menu,
    Description,
    Dialog,
    DialogPanel,
    DialogTitle,
    MenuButton,
    MenuItem,
    MenuItems,
    DialogBackdrop,
} from "@headlessui/react";
import { Delete, EllipsisVertical, MessageSquare, PanelLeft, PanelLeftDashed, Pin, Plus, Search, Share, Share2, Stars, Trash, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SummaryHistoryResponse } from "@/app/types";
import TaskManagerModal from "../modals/Tasks";
import ShareModal from "../modals/ShareModal";

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
    const router = useRouter()
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

    const toggleSidebar = () => { setIsOpen((v) => !v); console.log("working") };

    const fetchUserSummaries = async () => {
        try {
            const token = Cookies.get("access_token");
            const res = await axios.get("http://localhost:8000/chats/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            console.log("summaries", res.data)
            setChats(res.data.chats || []);
        } catch {
            setError("Failed to load summaries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserSummaries();
    }, []);

    useEffect(() => {
        setFiltered(
            chats.filter((s) =>
                s.title.toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, chats]);

    const handleDelete = async () => {
        try {
            const token = Cookies.get("access_token");
            await axios.delete(`http://localhost:8000/summary/?id=${summaryId}`, {
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
            const token = Cookies.get("access_token");
            const newPinStatus = !currentPinStatus;
            await axios.patch(`http://localhost:8000/summary/${chatId}/pin`,
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

    const grouped = groupSummariesByDate(filtered);
    const options = (chat: any) => [
        {
            label: chat.is_pinned ? "Unpin" : "Pin", route: '', icon: (<Pin size={20} className={chat.is_pinned ? "fill-white" : ""} />), action: (e: React.MouseEvent) => {
                e.preventDefault(); // Stop Link navigation
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
                e.preventDefault(); // Stop Link navigation
                setSummaryId(chat.id);
                setDialogOpen(true);
            }
        }
    ]
    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="p-3 rounded-full transition-colors shadow-sm
                    bg-slate-100 text-slate-700 hover:bg-slate-200
                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
            >
                <PanelLeft size={20} />
            </button>
            <div
                className={`fixed top-0 left-0 h-full w-72 border-r font-mono shadow-lg transform transition-all duration-300 z-50 
                    bg-white border-slate-200 text-slate-800
                    dark:bg-tertiary dark:border-secondary dark:text-white
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="p-4 space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Chats</h2>
                        <button onClick={toggleSidebar}>
                            <X size={20} className="transition-colors text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white" />
                        </button>
                    </div>
                    <hr className="border transition-colors border-slate-200 dark:border-secondary" />

                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
                    >
                        <Plus size={18} /> New Chat
                    </button>
                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                            bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-primary dark:hover:bg-white/10"
                    >
                        <Search size={18} /> Search Chat
                    </button>
                    <TaskManagerModal />

                    <div className="overflow-y-auto min-h-0 flex-1 custom-scrollbar pr-2">
                        {loading && <p className="text-slate-500 dark:text-gray-400">Loading…</p>}
                        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
                        <div className="space-y-4 overflow-y-auto">
                            {Object.keys(grouped).map((k) =>
                                grouped[k].length ? (
                                    <div key={k} className="space-y-2">
                                        <h3 className="font-bold text-sm tracking-wide text-slate-500 dark:text-gray-200">{k}</h3>
                                        <div className="space-y-1">
                                            {grouped[k].map((s) => (
                                                <Link
                                                    href={`/${s.id}`}
                                                    key={s.id}
                                                    className={`p-2 group relative overflow-hidden cursor-pointer flex items-center justify-between transition-colors rounded-xl
                                                        ${activeId == s.id
                                                            ? "font-medium bg-slate-100 border border-slate-200 text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-white"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-transparent"
                                                        }`}
                                                >
                                                    <span className="truncate pr-4">{s.title}</span>
                                                    <Menu>
                                                        <MenuButton className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200
                                                            bg-white text-slate-600 hover:bg-slate-200 shadow-sm
                                                            dark:bg-tertiary dark:hover:bg-white/5 dark:shadow-none">
                                                            <EllipsisVertical size={16} />
                                                        </MenuButton>
                                                        <MenuItems
                                                            transition
                                                            anchor="right"
                                                            className="w-52 origin-top-left mx-3 rounded-xl border flex flex-col p-2 z-50 text-sm/6 transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 shadow-xl
                                                                bg-white border-slate-200 text-slate-800
                                                                dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none"
                                                        >
                                                            {options(s).map(option => {
                                                                return (
                                                                    <MenuItem key={Math.random()}>
                                                                        <button
                                                                            onClick={option.action}
                                                                            className="group z-50 flex w-full p-2 items-center gap-3 rounded-lg text-sm font-bold transition-colors
                                                                                data-[focus]:bg-slate-100 
                                                                                dark:data-[focus]:bg-white/5"
                                                                        >
                                                                            {option.icon}
                                                                            {option.label}
                                                                        </button>
                                                                    </MenuItem>
                                                                )
                                                            })}
                                                        </MenuItems>
                                                    </Menu>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            )}
                        </div>
                    </div>
                    <Link
                        href="/plans"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm
                            bg-slate-900 text-white hover:bg-slate-800
                            dark:bg-primary dark:text-tertiary dark:hover:bg-white/90 dark:shadow-none"
                    >
                        <Stars size="20" />
                        Upgrade to Pro
                    </Link>
                </div>
            </div>

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                chatId={shareChatInfo.id}
                chatTitle={shareChatInfo.title}
            />

            {/* Delete Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                className="relative z-[60] font-mono"
            >
                {/* Animated Backdrop with Blur */}
                <DialogBackdrop
                    transition
                    className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                        bg-black/30 dark:bg-black/60"
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    {/* Animated Panel */}
                    <DialogPanel
                        transition
                        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                            bg-white border-slate-200 shadow-slate-200/50
                            dark:bg-tertiary dark:border-secondary dark:shadow-black/50"
                    >
                        <DialogTitle className="text-xl font-bold text-center
                            text-slate-900 dark:text-white"
                        >
                            Delete chat?
                        </DialogTitle>

                        <Description className="mt-3 text-sm leading-relaxed text-center
                            text-slate-500 dark:text-slate-400"
                        >
                            This action cannot be undone. It will permanently delete this conversation from your history.
                        </Description>

                        <div className="flex justify-center gap-3 mt-8">
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="px-4 py-2.5 rounded-xl font-semibold transition-colors
                                    text-slate-600 hover:text-slate-900 hover:bg-slate-100
                                    dark:text-slate-300 bg-white/5 dark:hover:text-white dark:hover:bg-white/10"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    handleDelete();
                                    setDialogOpen(false);
                                }}
                                className="px-5 py-2.5 rounded-xl font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-200"
                            >
                                Delete
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default Sidebar;
