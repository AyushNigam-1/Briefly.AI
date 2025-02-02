"use client";
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { SummaryHistoryResponse } from '../types';
import Navbar from '../components/Navbar';

// This helper function fetches the preview file URL.
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

const SummaryCard = ({ summary }: { summary: SummaryHistoryResponse }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const fileUrl = await previewFile(summary.url);
                setPreviewUrl(fileUrl);
            } catch (error) {
                console.error(`Error fetching preview for summary ${summary.id}`, error);
            }
        };
        fetchPreview();
    }, [summary.url, summary.id]);

    return (
        <div className='bg-gray-900 w-full rounded-lg flex justify-between items-center p-2 gap-2 m-1 border-2 border-gray-500'>
            <div className='flex gap-2' >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className='object-cover m-0 h-14 w-14 rounded-full border-gray-500 border-2'
                    />
                ) : (
                    <div className='m-0 h-14 w-14 rounded-full border-gray-500 border-2 bg-gray-700' />
                )}
                <span>
                    <h4 className='m-0 truncate text-lg font-semibold text-gray-200'>
                        {summary.title}
                    </h4>
                    <div>
                        <h6 className='text-gray-300 font-bold w-min py-1 rounded-lg'>
                            {summary.type}
                        </h6>
                        <span className='text-gray-300 font-bold w-min py-1 rounded-lg flex gap-2'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>

                            {summary.queries}
                        </span>
                    </div>
                </span>
            </div>
            <div className='flex gap-2' >
                <button className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full'  >
                    <span className='bg-gray-900 p-2 text-xl rounded-full  flex items-center justify-center' >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </span>
                </button>
                <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full'  >
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

    useEffect(() => {
        fetchUserSummaries();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <div className='container mx-auto flex flex-col gap-4 '>
                <Navbar />
                <h3 className='text-3xl font-bold'> History</h3>
                {summaries.map((summary) => (
                    <SummaryCard key={summary.id} summary={summary} />
                ))}
            </div>
        </>
    );
};

export default Page;
