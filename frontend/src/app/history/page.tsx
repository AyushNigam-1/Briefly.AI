"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { SummaryHistoryResponse, SortOptions } from '../types';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { Dialog, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ToastContainer, toast } from 'react-toastify';
import { Description, DialogPanel, DialogTitle } from '@headlessui/react'
import SummaryCard from '../components/SummaryCard';


const Page = () => {
    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [sortOrder, setSortOrder] = useState<string>('desc');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [previewCache, setPreviewCache] = useState<{ [key: string]: string }>({});
    const [favourites, setFavourites] = useState<string[]>([]);

    useEffect(() => {
        const storedFavourites: any[] = JSON.parse(localStorage.getItem("favourites") || "[]");
        setFavourites(storedFavourites.map(fav => fav.id));
    }, []);

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
        setFavourites((e) => !favourites.includes(summaryId) ? [...e, summaryId] : e.filter(fav => fav != summaryId))
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

            const { status } = response.data;

            setFavourites((e) => {
                if (status) return [...e, summaryId]
                else return [...e.filter(fav => fav != summaryId)]
            })
            localStorage.setItem("favourites", JSON.stringify(status ? [...favourites, summaryId] : [...favourites.filter(fav => fav != summaryId)]))

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
    useEffect(() => {
        fetchUserSummaries();
    }, []);

    const handleSortChange = (order: string) => {
        setSortOrder(order);
        setSummaries((prevSummaries) => {
            return [...prevSummaries].sort((a, b) =>
                order === 'asc' ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        });
    };
    const fetchUserSummaries = async () => {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(`http://localhost:8000/user_summaries/`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            setSummaries(response.data.summaries);
        } catch (error) {
            console.error("Error fetching user summaries:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserSummaries();
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
                    <h6 className='text-2xl font-bold text-gray-200'>History</h6>
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
                    {filteredSummaries.map((summary) => (
                        <SummaryCard key={summary.id} summary={summary} previewUrl={previewCache[summary.id] || null}
                            setIsDialogOpen={setIsDialogOpen} setSummaryId={setSummaryId} markSummaryAsFavorite={markSummaryAsFavorite} favourites={favourites} />))}
                </div> :
                    <p className='font-semibold text-xl text-center text-gray-400'>No history available.</p>
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
