import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { SummaryHistoryResponse, SidebarProps } from "../types";
import { Description, Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

const groupSummariesByDate = (summaries: SummaryHistoryResponse[]) => {
    const groupedSummaries: Record<string, SummaryHistoryResponse[]> = {
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

    summaries
        ?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .forEach((summary) => {
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


const Sidebar: React.FC<SidebarProps> = ({ setId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [filteredSummaries, setFilteredSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };
    async function markSummaryAsFavorite(summaryId?: string) {
        console.log(summaryId)
        if (!summaryId) return { error: "Summary ID is required" };

        try {
            console.log("Toggling favorite for summary ID:", summaryId);
            const token = Cookies.get("access_token");

            const response = await axios.post(
                `http://localhost:8000/summary/favorite?summary_id=${summaryId}`,
                {},
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                    withCredentials: true,
                }
            );

            // await fetchFavoriteSummaries()

            return response.data;
        } catch (error: any) {
            console.error("Error toggling favorite:", error.response?.data?.detail || error.message);
            return { error: error.response?.data?.detail || "Failed to toggle favorite" };
        }
    }
    const handleDeleteSummary = async () => {

        try {
            const token = Cookies.get("access_token");
            console.log(token)
            const response = await axios.delete(`http://localhost:8000/summary/?id=${summaryId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
            });

            if (response.status === 200) {
                const updatedSummaries = summaries?.filter((summary) => summary.id !== summaryId);
                setSummaries(updatedSummaries);
                setId(updatedSummaries[-1].id)
            } else {
                console.error("Error deleting summary:", response.data);
                setError("Failed to delete summary. Please try again."); // Set a user-friendly error message
            }
        } catch (error) {
            console.error("Error deleting summary:", error);
            setError("Failed to delete summary. Please try again."); // Set a user-friendly error message
        }
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
            console.log(response)
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
    useEffect(() => {
        setFilteredSummaries(
            summaries.filter((summary) =>
                summary.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [searchQuery, summaries]);

    const groupedSummaries = groupSummariesByDate(filteredSummaries);
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
                className={`fixed z-50 top-0 left-0 h-full w-72 bg-gray-900  transform transition-transform duration-300 z-99 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    } shadow-lg`}
            >

                <div className="p-4 flex flex-col h-full gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">History</h2>
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
                    {/* <span className="h-0.5 my-4 bg-gray-600" /> */}
                    <div className="flex bg-gray-800 rounded-md px-2">
                        <svg className="w-6  text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by title..."
                            className="p-2 text-gray-400 bg-transparent rounded-md w-full outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* <span className="h-0.5 my-4 bg-gray-600" /> */}
                    <div className="">
                        {loading ? (
                            <p>Loading summaries...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : filteredSummaries.length === 0 ? (
                            <p className="text-center text-gray-200">No summaries found.</p>
                        ) : (
                            <ul className="space-y-2">
                                {Object.keys(groupedSummaries).map((date) => (
                                    <div key={date} className={groupedSummaries[date].length === 0 ? "hidden" : ""}>
                                        <h3 className="font-semibold text-lg">{date}</h3>
                                        <ul className="py-4" >
                                            {groupedSummaries[date].map((summary) => (
                                                <li
                                                    key={summary.id}
                                                    className="text-gray-100 text-lg   rounded-md mb-2 cursor-pointer flex items-center justify-between gap-4 "
                                                    onClick={() => setId(summary.id)}
                                                >
                                                    <p className="text-ellipsis overflow-hidden whitespace-nowrap hover:text-gray-400">
                                                        {summary.title}
                                                    </p>
                                                    <button
                                                        className="text-gray-500   rounded-full hover:text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsDialogOpen(true)
                                                            setSummaryId(summary.id)
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                        </svg>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </ul>
                        )}
                    </div>
                    <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
                        <DialogPanel
                            transition
                            className="w-full max-w-md rounded-xl flex flex-col gap-3 bg-[#1b283b] shadow-md  p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
                        >
                            <DialogTitle className="text-2xl font-bold">Confirm Delete</DialogTitle >
                            <Description className="text-gray-200 text-lg">
                                Are you sure you want to delete this summary? This action cannot be undone.
                            </Description>
                            <div className="mt-4 flex justify-between gap-2">
                                <button onClick={() => { handleDeleteSummary(); setIsDialogOpen(false) }} className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full'  >
                                    <span className='bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg justify-center' >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        Confirm
                                    </span>
                                </button>
                                <button onClick={() => { setSummaryId(undefined); setIsDialogOpen(false) }} className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full'  >
                                    <span className='bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg justify-center' >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </span>
                                </button>

                            </div>
                        </DialogPanel>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
