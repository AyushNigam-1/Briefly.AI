import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { SummaryHistoryResponse, SidebarProps } from "../types";
import {
    Description,
    Dialog,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import { MessageSquare, PanelLeft, PanelLeftDashed, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
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
            const res = await axios.get("http://localhost:8000/user_summaries/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            console.log("summaries", res.data)
            setSummaries(res.data.summaries || []);
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
            summaries.filter((s) =>
                s.title.toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, summaries]);

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

            const updated = summaries.filter((s) => s.id !== summaryId);
            setSummaries(updated);
        } catch {
            setError("Delete failed");
        }
    };

    const grouped = groupSummariesByDate(filtered);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="text-secondary bg-primary p-3  rounded-full"
            >
                <PanelLeft size={20} />
            </button>
            <div
                className={`fixed top-0 left-0 h-full text-white w-72 bg-tertiary border-r border-secondary shadow-lg transform transition-transform duration-300 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-4 space-y-4 h-full ">
                    <div className="flex items-center justify-between">
                        {/* <div className="border-t border-secondary w-full"></div> */}
                        <h2 className="text-xl font-bold"> Chats</h2>
                        {/* <div className="border-t border-secondary w-full "></div> */}
                        <button onClick={toggleSidebar}>
                            <X size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>
                    <hr className="border border-secondary" />

                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full hover:bg-white/10 justify-center gap-2 font-bold bg-white/5 border border-secondary rounded-full text-primary"
                    >
                        <Plus size={20} /> New Chat
                    </button>
                    <button
                        onClick={() => router.push("/")}
                        className="p-3 flex items-center w-full hover:bg-white/10 justify-center gap-2 font-bold bg-white/5 border border-secondary rounded-full text-primary"
                    >
                        <Search size={20} /> Search Chat
                    </button>


                    <div className="flex-1 overflow-y-auto">
                        {loading && <p>Loading…</p>}
                        {error && <p className="text-red-400">{error}</p>}
                        <div className="space-y-2">
                            {Object.keys(grouped).map((k) =>
                                grouped[k].length ? (
                                    <div key={k} className="space-y-2">
                                        <h3 className="font-bold text-gray-200">{k}</h3>
                                        <div className="">
                                            {grouped[k].map((s) => (
                                                <Link
                                                    href={`/${s.id}`}
                                                    key={s.id}
                                                    className={`p-2 text-gray-300 cursor-pointer flex justify-between transition ${activeId == s.id
                                                        && " font-bold text-white bg-white/5 rounded-full"
                                                        }`}
                                                // className="flex justify-between cursor-pointer hover:text-gray-300"
                                                >
                                                    <span className="truncate text-lg font-semibold">{s.title}</span>

                                                    {/* <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSummaryId(s.id);
                                                            setDialogOpen(true);
                                                        }}
                                                    >
                                                        🗑
                                                    </button> */}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            )}
                        </div>
                    </div>
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
