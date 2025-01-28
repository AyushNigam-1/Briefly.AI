"use client"
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { ProgressResponse, SummaryResponse, query } from '@/app/types';
import { setupWebSocketListeners } from '@/websocket/webEvent';
import { connectWebSocket } from "@/websocket/websocket";
import BarLoader from "react-spinners/BarLoader";
import Navbar from '@/app/components/Navbar';
import Sidebar from '@/app/components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import QueryInput from '@/app/components/QueryInput';

const fetchExisitingSummary = async (summaryId: string) => {
    try {
        const token = Cookies.get("access_token");
        const response = await axios.get(`http://localhost:8000/summary/?id=${summaryId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.message || error.message);
        } else {
            throw new Error(String(error));
        }
    }
};

export const previewFile = async (file_url: string) => {
    if (file_url) {
        try {
            const response = await fetch(`http://localhost:8000/${file_url}`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`File not found with id ${file_url}`);
            }

            const fileBlob = await response.blob();
            const fileUrl = URL.createObjectURL(fileBlob);

            return fileUrl;
        } catch (error) {
            console.error('Error fetching file:', error);
            throw error;
        }
    };
    return ""
}

type Metadata = {
    icon: string,
    title: string,
    type: string
}
const page = () => {

    const [queries, setQueries] = useState<query[]>([]);
    const [isLoading, setLoading] = useState<boolean>(false);
    const [summary, setSummary] = useState<SummaryResponse | undefined>();
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<ProgressResponse>();
    const [metadata, setMetadata] = useState<Metadata | undefined>(undefined)
    const searchParams = useSearchParams();
    const params = useParams();
    const url = params?.url as string;
    const title = searchParams.get('title') as string;
    const language = searchParams.get('language') as string
    const format = searchParams.get('format') as string;
    const icon = searchParams.get('icon') as string;

    const queriesContainerRef = useRef<HTMLDivElement | null>(null);
    const [state, setState] = useState<string | undefined>(undefined);

    const getSummary = async (url?: string, lang?: string, format?: string, title?: string, icon?: string) => {
        console.log("called getSummary")
        setLoading(true);
        try {
            const token = Cookies.get("access_token");

            let file: File | null = null;

            if (url) {
                const decodedUrl = decodeURIComponent(url);

                const isLocalFile = decodedUrl.startsWith("blob:") || decodedUrl.startsWith("file:");

                if (isLocalFile) {
                    const response = await fetch(decodedUrl);
                    if (!response.ok) {
                        throw new Error("Failed to fetch the file from the provided URL.");
                    }
                    const blob = await response.blob();
                    file = new File([blob], title || "uploaded_file", { type: blob.type });
                } else {
                    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
                    if (!urlRegex.test(decodedUrl)) {
                        throw new Error("Invalid URL provided.");
                    }
                }
            }
            const formData = new FormData();
            if (url && !file) formData.append("url", url);
            if (file) formData.append("file", file);
            if (lang) formData.append("lang", lang);
            if (format) formData.append("format", format);
            if (title) formData.append("title", title);
            if (icon) formData.append('icon', icon)

            const { data } = await axios.post(
                "http://localhost:8000/summarize/",
                formData,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                    withCredentials: true,
                }
            );
            const preview_url = await previewFile(data.summary.url)
            setMetadata({ icon: preview_url, title: data.summary.title, type: data.summary.type })
            console.log(data)
            setSummary(data.summary);
            setQueries(data.summary.queries);
        } catch (error) {
            console.log(error)
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || error.message);
            } else {
                throw new Error(String(error));
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (summary) return
        connectWebSocket("ws://127.0.0.1:8000/ws")
        getSummary(url, language, format, title, icon);
    }, []);

    useEffect(() => {
        if (!summaryId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchExisitingSummary(summaryId);
                const preview_url = await previewFile(data.summary.url)
                setMetadata({ icon: preview_url, title: data.summary.title, type: data.summary.type })
                setSummary(data.summary);
                setQueries(data.summary.queries)
            } catch (error) {
                console.error("Failed to fetch summary:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [summaryId]);

    useEffect(() => {
        if (queriesContainerRef.current) {
            queriesContainerRef.current.scrollTo({
                top: queriesContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [queries]);
    useEffect(() => {
        setupWebSocketListeners({
            onOpen: () => console.log("WebSocket connection established in EventListenerComponent"),
            onMessage: (data) => setProgress(data),
            onClose: () => console.log("WebSocket connection closed in EventListenerComponent"),
            onError: (error) => console.error("WebSocket error:", error),
        });
    }, []);
    return isLoading ?
        <div className='h-screen w-screen flex flex-col items-center justify-center' >
            <div className='flex flex-col gap-3'>
                <div className='flex justify-between ' >
                    <h3 className='text-xl font-bold text-gray-200' > {progress?.message} </h3>
                    <h3 className='text-xl font-bold text-gray-200' >
                        {progress?.progress}%
                    </h3>
                </div>
                <BarLoader
                    color={"#ffffff"}
                    loading={isLoading}
                    height={10}
                    width={600}
                    aria-label="Loading Spinner"
                    data-testid="loader" />
            </div>
        </div>
        : (
            <>
                <Navbar component={<Sidebar setId={setSummaryId} />} />
                <div className='gap-1 flex items-center justify-center flex-col max-h-[100vh] max-w-[100vw] '>
                    <div className="flex flex-col gap-3 rounded-lg shadow container overflow-y-scroll mb-40 scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin" ref={queriesContainerRef}>
                        <div className='bg-gray-900 w-max rounded-lg flex p-2 gap-2 m-1 '>
                            <img src={metadata?.icon} alt="" className='m-0 h-14 rounded-lg' />
                            <span>
                                <h4 className='m-0 truncate text-lg font-semibold text-gray-200' >{metadata?.title.split(" ").slice(0, 5).join(" ")}...</h4>
                                <h6 className='text-sm bg-gray-600 w-min py-1 px-2  rounded-lg' >{metadata?.type}</h6>
                            </span>
                        </div>
                        <div className="bg-gray-900 font-mono border-gray-700 scrollbar-thumb-gray-500  w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">

                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                                }}
                            >
                                {summary?.summarized_summary}
                            </ReactMarkdown>
                        </div>
                        <div className="flex flex-col gap-3">
                            {queries?.map((query, index) =>
                                <div key={index} className="bg-gray-900 p-4 rounded-lg font-mono flex gap-2">
                                    <div>
                                        {
                                            query.sender == 'user' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 w-max">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 w-max">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                            </svg>
                                        }
                                    </div>
                                    <div>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                                            }}
                                        >
                                            {query.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            {
                                state == 'pending' ?
                                    <div className="bg-gray-900/70 p-4 rounded-lg font-mono flex gap-2 items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                        </svg>
                                        <svg fill="currentColor" height="30" width="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="4" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite" /></circle>
                                            <circle cx="12" cy="12" r="3"><animate attributeName="r" dur="0.75s" values="3;1.5;3" repeatCount="indefinite" /></circle>
                                            <circle cx="20" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite" /></circle>
                                        </svg>
                                    </div> : null
                            }
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-3 p-2 w-full fixed bottom-0 left-0 right-0">
                    <QueryInput setQueries={setQueries} url={url} setState={setState} id={summary?.id} />
                </div>
            </>
        )

}

export default page