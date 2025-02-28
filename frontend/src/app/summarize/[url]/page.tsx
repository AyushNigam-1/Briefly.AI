"use client"
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { Metadata, ProgressResponse, SummaryResponse, query, webRecommendations, ytRecommendations } from '@/app/types';
import { setupWebSocketListeners } from '@/websocket/webEvent';
import { connectWebSocket } from "@/websocket/websocket";
import HashLoader from "react-spinners/HashLoader"
import Navbar from '@/app/components/Navbar';
import Sidebar from '@/app/components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import QueryInput from '@/app/components/QueryInput';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'

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
            console.log(fileUrl)
            return fileUrl;
        } catch (error) {
            console.error('Error fetching file:', error);
            throw error;
        }
    };
    return ""
}

let cancelTokenSource: AbortController | null = null;

const page = () => {

    const [queries, setQueries] = useState<query[]>([]);
    const [isLoading, setLoading] = useState<boolean>(false);
    const [summary, setSummary] = useState<SummaryResponse>();
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<ProgressResponse>();
    const [metadata, setMetadata] = useState<Metadata | undefined>(undefined)
    // const []
    const searchParams = useSearchParams();
    const params = useParams();
    const id = searchParams.get('id') as string;
    const url = params?.url as string;
    const title = searchParams.get('title') as string;
    const language = searchParams.get('language') as string
    const format = searchParams.get('format') as string;
    const icon = searchParams.get('icon') as string;
    const [text, setText] = useState('Copy')
    const [text2, setText2] = useState('Regenrate')
    const [ytRecommendations, setytRecommendations] = useState<ytRecommendations[] | undefined>(undefined);
    const [webRecommendations, setWebRecommendations] = useState<webRecommendations[] | undefined>(undefined);
    const [recommendationLoader, setRecommendationLoader] = useState<boolean>(false);
    const queriesContainerRef = useRef<HTMLDivElement | null>(null);
    const [state, setState] = useState<string | undefined>(undefined);

    const copyToClipboard = async (text?: string) => {
        if (text)
            try {
                await navigator.clipboard.writeText(text);
                console.log('Text copied to clipboard');
                setText('Copied!')
                setTimeout(() => {
                    setText('Copy')
                }, 2000)
                return true; // Success
            } catch (err) {
                console.error('Failed to copy text: ', err);
                return false; // Failure
            }
    };

    const fetchRecommendations = async (scriptId?: string) => {
        setRecommendationLoader(true);

        if (cancelTokenSource) {
            cancelTokenSource.abort();
        }

        cancelTokenSource = new AbortController();

        try {
            const token = Cookies.get("access_token");
            if (!token) {
                throw new Error("Unauthorized: No access token found");
            }

            const response = await axios.get(
                `http://localhost:8000/summary/recommendations/?summary_id=${scriptId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: cancelTokenSource.signal,
                }
            );

            console.log("Full API Response:", response.data);

            if (!response.data || typeof response.data !== "object") {
                throw new Error("Invalid response format: response data is not an object");
            }

            if (!response.data.recommendations || typeof response.data.recommendations !== "string") {
                throw new Error("Invalid response format: recommendations field missing or not a string");
            }

            let recommendations = response.data.recommendations.replace(/```json|```/g, "").trim();

            try {
                const data = JSON.parse(recommendations);
                console.log("Parsed Data:", data);

                if (!data.youtube || !data.website) {
                    throw new Error("Missing expected recommendation data");
                }

                setytRecommendations(data.youtube);
                setWebRecommendations(data.website);
            } catch (jsonError) {
                console.error("Error parsing recommendations JSON:", jsonError);
                throw new Error("Failed to parse recommendations JSON");
            }
        } catch (error: any) {
            if (axios.isCancel(error)) {
                console.log("Request canceled:", error.message);
            } else if (error.response) {
                console.error("Server error:", error.response.status, error.response.data);
            } else {
                console.error("Unexpected error fetching recommendations:", error.message || error);
            }
        } finally {
            setRecommendationLoader(false);
        }
    };



    const handleRegenerate = async () => {
        setText2('Regenrating . . .')
        try {
            const { data } = await axios.post(`http://localhost:8000/regenerate_summary?id=${summaryId}&language=${language}&format=${format}`)
            console.log(data)
            setSummary(data)
        } catch (err) {
            // setError(err.message);
        } finally {
            setText2("Regenrate");
        }
    };

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
            if (url) formData.append("url", url);
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
            console.log(data)
            const preview_url = await previewFile(data.summary.thumbnail)
            console.log(preview_url)
            setMetadata({ icon: preview_url, title: data.summary.title, type: data.summary.type })
            setSummaryId(data.summary.id)

            setSummary(data.summary);
            setQueries(data.summary.queries);
            // fetchRecommendations(data.summary.id)
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || error.message);
            } else {
                throw new Error(String(error));
            }
        } finally {
            setLoading(false);
        }
    };

    async function markSummaryAsFavorite(summaryId?: string) {
        try {
            console.log(summaryId)
            const token = Cookies.get("access_token");

            const response = await axios.post(`http://localhost:8000/summary/favorite?summary_id=${summaryId}`, {
                summary_id: summaryId
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                withCredentials: true,
            });

            return response.data;
        } catch (error: any) {
            console.error('Error:', error.response?.data?.detail || error.message);
            return { error: error.response?.data?.detail || 'Failed to mark summary as favorite' };
        }
    }

    const cancelRecommendations = () => {
        if (cancelTokenSource) {
            cancelTokenSource.abort();
            console.log("Fetch request canceled.");
        }
    };
    useEffect(() => {
        if (summary) return
        connectWebSocket("ws://127.0.0.1:8000/ws")
        if (id) {
            setSummaryId(id)
            // fetchRecommendations(id)
        }
        else {
            getSummary(url, language, format, title, icon);
        }
    }, []);

    useEffect(() => {
        if (!summaryId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchExisitingSummary(summaryId);
                const thumbnail = await previewFile(data.summary.thumbnail)
                console.log(data)
                setMetadata({ icon: thumbnail, title: data.summary.title, type: data.summary.type })
                setSummary(data.summary);
                setQueries(data.summary.queries)
                // fetchRecommendations(data.summary.id)

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
                {/* <div className='flex justify-between ' >
                    <h3 className='text-xl font-bold text-gray-200' > {progress?.message} </h3>
                    <h3 className='text-xl font-bold text-gray-200' >
                        {progress?.progress}%
                    </h3>
                </div> */}
                <HashLoader
                    color={"#ffffff"}
                    loading={isLoading}
                    size="100"
                    aria-label="Loading Spinner"
                    data-testid="loader" />
            </div>
        </div>
        : (
            <>
                <Navbar component={<Sidebar setId={setSummaryId} />} />
                <div className='gap-1 flex items-center justify-center flex-col  '>
                    <div className="flex flex-col gap-3 rounded-lg shadow container overflow-y-scroll  scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin scrollbar-track-rounded-full scrollbar-thumb-rounded-full" ref={queriesContainerRef}>
                        {/* <div className='flex justify-between mt-2 items-center bg-gray-900' >
                            <div className=' w-max rounded-lg flex p-2 gap-2 items-center '>
                                <img src={metadata?.icon} alt="youtube-play--v1" className='w-16 ' />
                                <span>
                                    <h4 className='m-0 truncate text-lg font-bold text-gray-200' >{metadata?.title}</h4>
                                    <h6 className='text-gray-400 font-bold w-min   rounded-xl flex items-center gap-1'>
                                        {
                                            metadata?.type == 'Video' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                            </svg> : metadata?.type == 'Image' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                            </svg>
                                                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                </svg>
                                        }
                                        {metadata?.type}
                                    </h6>
                                </span>
                            </div>
                            <div className='flex gap-3' >
                                <button className=' p-2 rounded-full' onClick={() => markSummaryAsFavorite(summary?.id)} >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                                    </svg>
                                </button>
                                <button className=' p-3 rounded-full' >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                </button>
                            </div>
                        </div> */}
                        <Disclosure>
                            <DisclosureButton className="flex items-center gap-2 text-gray-400">
                                Thought <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </DisclosureButton>
                            <DisclosurePanel className="text-gray-400 text-lg">
                                {summary?.thought}
                            </DisclosurePanel>
                        </Disclosure>
                        <div className="bg-gray-900 relative font-mono border-gray-700  w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                                }}
                            >
                                {summary?.summarized_summary}
                            </ReactMarkdown>
                        </div>
                        <div className='flex justify-center gap-3 ' >
                            <button onClick={() => copyToClipboard(summary?.summarized_summary)} className='bg-gradient-to-t from-blue-500 to-gray-900 p-1 rounded-full'  >
                                <span className='bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg justify-center' >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                    </svg>
                                    {text}
                                </span>
                            </button>
                            <button className='bg-gradient-to-t from-red-500 to-gray-900 p-1 rounded-full' onClick={handleRegenerate}>
                                <span className='bg-gray-900 py-3 px-4 rounded-full flex gap-2 items-center text-lg' >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`size-6 ${text2 == 'Regenrating . . .' ? 'animate-spin-slow' : ''} `}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    {text2}
                                </span>
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {queries?.map((query, index) =>
                                <div key={index} className='flex flex-col gap-2'>
                                    {query.sender == 'llm' ? <Disclosure>
                                        <DisclosureButton className="flex items-center gap-2 text-gray-400">
                                            Thought <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </DisclosureButton>
                                        <DisclosurePanel className="text-gray-400 text-lg">
                                            {query?.thought}
                                        </DisclosurePanel>
                                    </Disclosure> : ''}
                                    <div className="bg-gray-900 p-4 rounded-lg font-mono flex gap-2">
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
                </div >
                <div className="flex flex-col gap-3 p-2 w-full fixed bottom-0 left-0 right-0">
                    <QueryInput setQueries={setQueries} cancelRecommendations={cancelRecommendations} url={url} setState={setState} id={summaryId} ytRecommendations={ytRecommendations} webRecommendations={webRecommendations} isloading={recommendationLoader} fetchRecommendations={fetchRecommendations} />
                </div>
            </>
        )
}

export default page

