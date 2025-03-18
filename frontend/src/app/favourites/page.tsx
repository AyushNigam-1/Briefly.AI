"use client";

import axios from "axios";
import Cookies from "js-cookie";
import { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import Navbar from "../components/Navbar";
import { Description, Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Loader from "../components/Loader";
import { SortOptions, SummaryHistoryResponse } from "../types";
import SummaryCard from "../components/SummaryCard";
import Link from "next/link";

const Page = () => {
    const [error, setError] = useState<string | null>(null);
    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [sortOrder, setSortOrder] = useState<string>('desc');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [previewCache, setPreviewCache] = useState<{ [key: string]: string }>({});

    const confirmDelete = () => {
        setIsDialogOpen(false);
        handleDeleteSummary(summaryId);
    };
    const options = useMemo<SortOptions[]>(() => [{
        sort: "desc", order: 'Newest First', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
        </svg>)
    }, {
        sort: 'asc', order: 'Older First', icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
        </svg>

        )
    }], [])
    async function markSummaryAsFavorite(summaryId?: string) {
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

            await fetchFavoriteSummaries()

            return response.data;
        } catch (error: any) {
            console.error("Error toggling favorite:", error.response?.data?.detail || error.message);
            return { error: error.response?.data?.detail || "Failed to toggle favorite" };
        }
    }
    const handleDeleteSummary = async (summaryId?: string) => {

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
                toast.success('Deleted Successfully');
            } else {
                console.error("Error deleting summary:", response.data);
                // setError("Failed to delete summary. Please try again."); // Set a user-friendly error message
            }
        } catch (error) {
            console.error("Error deleting summary:", error);
            // setError("Failed to delete summary. Please try again."); // Set a user-friendly error message
        }
    };

    function formatRelativeDate(timestamp: string): string {
        const cleanedTimestamp = timestamp.split('.')[0] + 'Z';
        const date = new Date(cleanedTimestamp);
        const now = new Date();

        const differenceInMilliseconds = now.getTime() - date.getTime();
        const differenceInSeconds = Math.floor(differenceInMilliseconds / 1000);
        const differenceInMinutes = Math.floor(differenceInSeconds / 60);
        const differenceInHours = Math.floor(differenceInMinutes / 60);
        const differenceInDays = Math.floor(differenceInHours / 24);
        const differenceInMonths = Math.floor(differenceInDays / 30);
        const differenceInYears = Math.floor(differenceInDays / 365);

        if (differenceInMinutes < 1) {
            return "just now";
        } else if (differenceInMinutes < 60) {
            return `${differenceInMinutes} minute${differenceInMinutes !== 1 ? 's' : ''} ago`;
        } else if (differenceInHours < 24) {
            return `${differenceInHours} hour${differenceInHours !== 1 ? 's' : ''} ago`;
        } else if (differenceInDays < 30) {
            return `${differenceInDays} day${differenceInDays !== 1 ? 's' : ''} ago`;
        } else if (differenceInDays < 365) {
            return `${differenceInMonths} month${differenceInMonths !== 1 ? 's' : ''} ago`;
        } else {
            return `${differenceInYears} year${differenceInYears !== 1 ? 's' : ''} ago`;
        }
    }

    const handleSortChange = (order: string) => {
        setSortOrder(order);
        setSummaries((prevSummaries) => {
            return [...prevSummaries].sort((a, b) =>
                order === 'asc' ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        });
    };
    async function fetchFavoriteSummaries() {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(
                "http://localhost:8000/summary/favorites/",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    withCredentials: true,
                }
            );
            console.log(response.data.favorites)
            setSummaries(response.data.favorites);
            localStorage.setItem("favourites", JSON.stringify(response.data.favorites))
        } catch (error: any) {
            setError(error.response?.data?.detail || error.message);
            return [];
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFavoriteSummaries();
    }, []);

    const filteredSummaries = useMemo(() => {
        return summaries.filter((summary) =>
            summary.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [summaries, searchQuery]);
    const previewFile = async (file_url: string): Promise<string> => {
        if (file_url) {
            try {
                const response = await fetch(`http://localhost:8000/${file_url}`, {
                    method: 'GET',
                });
                if (!response.ok) {
                    throw new Error(`File not found with id ${file_url}`);
                }
                const fileBlob = await response.blob();
                return URL.createObjectURL(fileBlob);
            } catch (error) {
                console.error('Error fetching file:', error);
                throw error;
            }
        }
        return "";
    };
    const fetchPreview = async (summary: SummaryHistoryResponse) => {
        if (previewCache[summary.id]) return; // Skip if already cached

        try {
            const fileUrl = await previewFile(summary.thumbnail);
            setPreviewCache((prevCache) => ({ ...prevCache, [summary.id]: fileUrl }));
        } catch (error) {
            console.error(`Error fetching preview for summary ${summary.id}`, error);
        }
    };

    useEffect(() => {
        filteredSummaries.forEach(fetchPreview);
    }, [filteredSummaries]);
    return (
        <>
            <ToastContainer />
            <div className='container mx-auto flex flex-col gap-4 ' >
                <Navbar />
                <div className='flex justify-between items-center' >
                    <h6 className='text-2xl font-bold text-gray-200'>Favourites</h6>
                    <div className='flex gap-2 items-center' >
                        <span className='flex gap-2 items-center bg-gray-900 py-1 px-4 rounded-full' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input type="text" className='py-2 bg-transparent outline-none ' placeholder='Search' value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)} />

                        </span>
                        <Menu>
                            <MenuButton className="bg-gray-900 p-3 px-5 rounded-full flex gap-1 items-center" >{sortOrder == 'desc' ? 'Newest First' : 'Oldest First'} <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                            </svg>
                            </MenuButton>
                            <MenuItems transition
                                anchor="bottom end" className="w-52 origin-top-right my-2 rounded-xl border-2 border-gray-500 bg-gray-900 p-1 text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50">
                                {
                                    options.map((option, i) => {
                                        return (
                                            <MenuItem key={i} as="div" className="group z-50 flex w-full items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10 text-lg font-semibold">
                                                <button onClick={() => handleSortChange(option.sort)} className="flex w-full items-center gap-2">
                                                    {option.icon}
                                                    {option.order}
                                                </button>
                                            </MenuItem>
                                        )
                                    })
                                }
                            </MenuItems>
                        </Menu>
                    </div>
                </div>
                {loading ? <div className='w-full flex justify-center items-center' >
                    <Loader />
                </div> : filteredSummaries.length > 0 ? <div className='grid grid-cols-4 gap-4  h-full scrollbar-thin' >
                    {filteredSummaries.map((summary) => <div key={summary.id} className='bg-gray-900 w-full rounded-lg flex justify-between items-center  gap-2 m-1 transition-all delay-100 '>
                        <div className='flex flex-col gap-2 w-full' >
                            <div className="w-full" >

                                {previewCache[summary.id] ? (
                                    <img
                                        src={previewCache[summary.id]}
                                        alt="Preview"
                                        className='m-0 object-cover h-48 w-full rounded-t-lg'
                                    />
                                ) : (
                                    <div className='m-0 h-48 rounded-t-lg bg-gray-700' />
                                )}
                            </div>
                            <span className='flex flex-col h-full justify-between p-2 gap-2'>
                                <h4 className='m-0 text-lg font-bold text-gray-100 line-clamp-2 min-h-14'>
                                    <Link href={`/summarize/${encodeURIComponent(summary.url)}?id=${summary.id}`} className="hover:underline" >
                                        {summary.title}
                                    </Link>
                                </h4>
                                <div className='flex justify-between items-center mt-auto'>
                                    <div className="flex gap-3">
                                        <h6 className='text-gray-300 font-bold w-min py-1 p-1 rounded-xl flex items-center gap-1'>
                                            {
                                                summary.type == 'Video' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                </svg> : summary.type == 'Image' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                                </svg>
                                                    : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                    </svg>
                                            }
                                            {summary.type}
                                        </h6>
                                        <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-1 items-center'>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                                            </svg>

                                            {summary.queries}
                                        </span>
                                        <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-1 items-center text-nowrap'>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                            {formatRelativeDate(summary.timestamp)}
                                        </span>
                                    </div>
                                    <div className="flex gap-2" >
                                        <button onClick={() => markSummaryAsFavorite(summary.id)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24" className='size-5 hover:text-white  stroke-none fill-red-500 '>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                            </svg>

                                        </button>
                                        <button onClick={(event) => {
                                            event.stopPropagation(); setIsDialogOpen(true); setSummaryId(summary.id)
                                        }} ><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 hover:text-red-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </span>
                        </div>
                    </div>
                    )}
                </div> :
                    <p className='font-semibold text-xl text-center text-gray-400'>No Favourties available.</p>
                }

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
                            <button onClick={() => confirmDelete()} className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full'  >
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
        </>
    );
};

export default Page;
