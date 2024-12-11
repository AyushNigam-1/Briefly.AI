import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import dynamic from "next/dynamic";

const PopupMenu = dynamic(() => import("./PromptPopup"), { ssr: false });

interface Summary {
    id: string;
    video_title: string;
    timestamp: string;
}
interface SidebarProps {
    setId: React.Dispatch<React.SetStateAction<string | undefined>>;
}
const groupSummariesByDate = (summaries: Summary[]) => {
    const groupedSummaries: Record<string, Summary[]> = {
        Today: [],
        Yesterday: [],
        "Previous 7 Days": [],
        "Previous 30 Days": [],
        Older: [],
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfLast7Days = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLast30Days = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
    

    summaries.forEach((summary) => {
        const summaryDate = new Date(summary.timestamp);

        if (summaryDate >= startOfToday) {
            groupedSummaries["Today"].push(summary);
        } else if (summaryDate >= startOfYesterday) {
            groupedSummaries["Yesterday"].push(summary);
        } else if (summaryDate >= startOfLast7Days) {
            groupedSummaries["Previous 7 Days"].push(summary);
        } else if (summaryDate >= startOfLast30Days) {
            groupedSummaries["Previous 30 Days"].push(summary);
        } else {
            groupedSummaries["Older"].push(summary);
        }
    });

    return groupedSummaries;
};
const menuItems = [
    { label: "Edit", onClick: () => alert("Edit clicked") },
    { label: "Delete", onClick: () => alert("Delete clicked") },
    { label: "View", onClick: () => alert("View clicked") },
];
const Sidebar: React.FC<SidebarProps> = ({ setId }) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    const fetchUserSummaries = async () => {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(`http://localhost:8000/user_summaries/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
            });
            setSummaries(response.data.summaries)
        } catch (error) {
            console.error("Error fetching user summaries:", error);
            return [];
        }
        finally {
            setLoading(false)
        }
    };

    useEffect(() => {
        fetchUserSummaries();
    }, []);
    const groupedSummaries = groupSummariesByDate(summaries);
    return (
        <div>
            <button
                onClick={toggleSidebar}
                className="p-2 text-white rounded-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto z-99" : "opacity-0 pointer-events-none"
                    }`}
                onClick={toggleSidebar}
            ></div>

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-gray-700 shadow-lg transform transition-transform duration-300 z-99 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >

                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">History</h2>
                        <button
                            onClick={toggleSidebar}
                            className="text-gray-500 hover:text-gray-800"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-4 flex-grow">
                        {loading ? (
                            <p>Loading summaries...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : Object.keys(groupedSummaries).length === 0 ? (
                            <p>No summaries found.</p>
                        ) : (
                            <ul className="space-y-2">
                                {Object.keys(groupedSummaries).map((date) => (
                                    <div key={date}>
                                        {
                                            groupedSummaries[date].length != 0 && <>
                                                <h3 className="text-white font-semibold mt-2 mb-1">{date}</h3>
                                                <ul>
                                                    {groupedSummaries[date].map((summary) => (
                                                        <li
                                                            key={summary.id}
                                                            className="text-gray-300 hover:bg-gray-900 p-2 rounded-md mb-2 cursor-pointer"
                                                            onClick={() => setId(summary.id)}
                                                        >
                                                            <p className="text-white text-ellipsis overflow-hidden whitespace-nowrap">
                                                                {summary.video_title}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        }
                                    </div>
                                ))}
                            </ul>
                        )}
                    </div>
                    {/* <PopupMenu
                        trigger={<button>Open Menu</button>}
                        items={["Edit", "Delete", "Share"]}
                    /> */}
                    {isClient && (
                    <button className="flex items-center justify-center gap-2 bg-gray-900/70 p-2 rounded-lg"> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
 Custom Prompt</button>)}
 
                </div>
                <PopupMenu
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                />
            </div>
        </div>
    );
};

export default Sidebar;
