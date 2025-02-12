"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { SummaryHistoryResponse, SortOptions, SummaryCardProps } from '../types';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { Dialog, Menu, MenuButton, MenuItem, MenuItems, Select } from '@headlessui/react'
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import { Description, DialogPanel, DialogTitle } from '@headlessui/react'

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

const SummaryCard = ({ summary, setIsDialogOpen, setSummaryId }: SummaryCardProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);


    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const fileUrl = await previewFile(summary.thumbnail);
                setPreviewUrl(fileUrl);
            } catch (error) {
                console.error(`Error fetching preview for summary ${summary.id}`, error);
            }
        };
        fetchPreview();
    }, [summary.url, summary.id]);

    return (
        <div className='bg-gray-900 w-full rounded-lg flex justify-between items-center p-2 gap-2 m-1 border-2 border-gray-500 '>
            <div className='flex gap-2' >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className='object-cover m-0 w-20 rounded-lg border-gray-500 border-2'
                    />
                ) : (
                    <div className='m-0 w-20 rounded-lg border-gray-500 border-2 bg-gray-700' />
                )}
                <span>
                    <h4 className='m-0 truncate text-lg font-bold text-gray-200'>
                        {summary.title.split(" ").slice(0, 5).join(" ")}. . .
                    </h4>
                    <div className='flex gap-3'>
                        <h6 className='text-gray-300 font-bold w-min py-1 p-1 rounded-xl flex items-center gap-1'>
                            {
                                summary.type == 'Video' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg> : ''
                            }
                            {summary.type}
                        </h6>
                        <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-1 items-center'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>

                            {summary.queries}
                        </span>
                    </div>
                </span>
            </div>
            <div className='flex gap-2' >
                <Link href={`/summarize/${encodeURIComponent(summary.url)}?title=${summary?.title}`} className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full'>
                    <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </span>
                </Link>
                <button onClick={() => { setSummaryId(summary.id); setIsDialogOpen(true) }} className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full'  >
                    <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </span>
                </button>

            </div>
        </div>

    );
};


const Page = () => {
    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [sortOrder, setSortOrder] = useState<string>('desc');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
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
    const fetchUserSummaries = async () => {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(`http://localhost:8000/user_summaries/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
            });
            console.log(response);
            setSummaries(response.data.summaries);
        } catch (error) {
            console.error("Error fetching user summaries:", error);
        } finally {
            setLoading(false);
        }
    };
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

    if (loading) {
        return <div className='w-screen h-screen flex justify-center items-center' >
            <Loader />
        </div>
    }

    return (
        <>
            <ToastContainer />
            <div className='container mx-auto flex flex-col gap-4 '>
                <Navbar />
                <div className='flex justify-between items-center' >
                    <h6 className='text-2xl font-bold text-gray-200'>History</h6>
                    <div className='flex gap-2 items-center' >
                        <span className='flex gap-2 items-center bg-gray-900 py-1 px-4 rounded-full' >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input type="text" className='py-2 bg-transparent outline-none ' placeholder='Search' />

                        </span>
                        <Menu>
                            <MenuButton className="bg-gray-900 p-3 px-5 rounded-full flex gap-1 items-center" >Sort By <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                            </svg>
                            </MenuButton>
                            <MenuItems transition
                                anchor="bottom end" className="w-52 origin-top-right my-2 rounded-xl border-2 border-gray-500 bg-gray-900 p-1 text-sm/6 text-white transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 z-50">

                                {options.map((option, i) => {
                                    return (
                                        <MenuItem key={i} as="div" className="group z-50 flex w-full items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10 text-lg font-semibold">
                                            <button onClick={() => handleSortChange(option.sort)} className="flex w-full items-center gap-2">
                                                {option.icon}
                                                {option.order}
                                            </button>
                                        </MenuItem>
                                    )
                                })}
                            </MenuItems>
                        </Menu>
                    </div>
                </div>
                <div className='grid grid-cols-2 gap-4' >
                    {summaries.map((summary) => (
                        <SummaryCard key={summary.id} summary={summary} handleDeleteSummary={handleDeleteSummary} setIsDialogOpen={setIsDialogOpen} setSummaryId={setSummaryId} />
                    ))}
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
