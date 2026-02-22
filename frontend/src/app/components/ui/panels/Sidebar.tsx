import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import axios from "axios";
// import { SummaryHistoryResponse, SidebarProps } from "../../types";
import {
    Menu,
    Description,
    Dialog,
    DialogPanel,
    DialogTitle,
    MenuButton,
    MenuItem,
    MenuItems,
} from "@headlessui/react";
import { Delete, EllipsisVertical, MessageSquare, PanelLeft, PanelLeftDashed, Pin, Plus, Search, Share, Share2, Stars, Trash, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SummaryHistoryResponse } from "@/app/types";
import TaskManagerModal from "../modals/Tasks";

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
    const params = useParams();
    const activeId = params?.id;

    const toggleSidebar = () => { setIsOpen((v) => !v); console.log("working") };

    // --------------------------------------------------
    // Fetch summaries
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Delete summary
    // --------------------------------------------------

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

    const grouped = groupSummariesByDate(filtered);
    const options = useMemo(() => [
        {
            label: "Pin", route: '', icon: (<Pin size={20} />)
        },
        {
            label: "Share", route: '/favourites', icon: (<Share2 size={20} />)
        },
        {
            label: 'Delete', route: '/account/logout', icon: (<Trash size={20} />)
        }
    ], [])
    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="text-tertiary bg-primary p-3  rounded-full"
            >
                <PanelLeft size={20} />
            </button>
            <div
                className={`fixed top-0 left-0 h-full text-white w-72 bg-tertiary border-r font-mono border-secondary shadow-lg transform transition-transform duration-300 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-4 space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold"> Chats</h2>
                        <button onClick={toggleSidebar}>
                            <X size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>
                    <hr className="border border-secondary" />

                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full hover:bg-white/10 justify-center gap-2 font-bold bg-white/5 border border-secondary rounded-xl text-primary"
                    >
                        <Plus size={18} /> New Chat
                    </button>
                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full hover:bg-white/10 justify-center gap-2 font-bold bg-white/5 border border-secondary rounded-xl text-primary"
                    >
                        <Search size={18} /> Search Chat
                    </button>
                    <TaskManagerModal />

                    <div className="overflow-y-auto min-h-0 flex-1 custom-scrollbar">
                        {loading && <p>Loading…</p>}
                        {error && <p className="text-red-400">{error}</p>}
                        <div className="space-y-2 overflow-y-auto">
                            {Object.keys(grouped).map((k) =>
                                grouped[k].length ? (
                                    <div key={k} className="space-y-2">
                                        <h3 className="font-bold text-gray-200">{k}</h3>
                                        <div className="">
                                            {grouped[k].map((s) => (
                                                <Link
                                                    href={`/${s.id}`}
                                                    key={s.id}
                                                    className={`p-2 mr-2 group relative overflow-hidden text-gray-400 cursor-pointer flex items-center justify-between transition ${activeId == s.id
                                                        ? "font-medium text-white bg-white/5 border border-secondary rounded-xl" : "hover:text-white"
                                                        }`}
                                                >
                                                    <span className="truncate ">{s.title}</span>
                                                    <Menu>
                                                        <MenuButton className="p-1 rounded-full bg-tertiary hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <EllipsisVertical size={20} />
                                                        </MenuButton>
                                                        <MenuItems
                                                            transition
                                                            anchor="right"
                                                            className="w-52 origin-bottom-right mx-3 rounded-xl border bg-tertiary border-gray-800 
                                                                        text-sm/6 text-primary transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50 flex flex-col p-2">
                                                            {
                                                                options.map(option => {
                                                                    return <MenuItem key={Math.random()}>
                                                                        <button className="group z-50 flex w-full p-2 items-center gap-2 rounded-lg data-[focus]:bg-white/5 text-lg font-bold">
                                                                            {option.icon}
                                                                            {option.label}
                                                                        </button>
                                                                    </MenuItem>
                                                                })
                                                            }

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
                        className="flex items-center justify-center gap-2 bg-primary text-tertiary px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
                    ><Stars size="20" />
                        Upgrade to Pro
                    </Link>
                </div>
            </div >

            {/* Delete Dialog */}
            < Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" >
                <DialogPanel className="bg-gray-900 p-6 rounded-xl w-80">

                    <DialogTitle className="text-xl font-bold">Delete summary?</DialogTitle>

                    <Description className="text-gray-400 mt-2">
                        This cannot be undone.
                    </Description>

                    <div className="flex justify-between mt-4">
                        <button
                            onClick={() => {
                                handleDelete();
                                setDialogOpen(false);
                            }}
                            className="bg-red-600 px-4 py-2 rounded"
                        >
                            Confirm
                        </button>

                        <button
                            onClick={() => setDialogOpen(false)}
                            className="bg-gray-700 px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </DialogPanel>
            </Dialog >
        </>
    );
};

export default Sidebar;
