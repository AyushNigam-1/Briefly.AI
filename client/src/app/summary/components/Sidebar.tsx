import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
interface Summary {
    id: string;
    video_title: string;
    timestamp: string;
}
interface SidebarProps {
    setId: React.Dispatch<React.SetStateAction<string | undefined>>;
}
const groupSummariesByDate = (summaries: Summary[]) => {
    const groupedSummaries: Record<string, Summary[]> = {};

    summaries.forEach((summary) => {
        const date = new Date(summary.timestamp).toLocaleDateString(); // Extract date only
        if (!groupedSummaries[date]) {
            groupedSummaries[date] = [];
        }
        groupedSummaries[date].push(summary);
    });

    return groupedSummaries;
};
const Sidebar: React.FC<SidebarProps> = ({ setId }) => {

    const [isOpen, setIsOpen] = useState(false);
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

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
        finally{
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
                    <div className="mt-4">

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
                                        {/* Render Date Heading */}
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
                                    </div>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
