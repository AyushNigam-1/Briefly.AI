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
import Loader from '@/app/components/Loader';
import { Heart, Loader2, Sparkle, Sparkles, User } from 'lucide-react';

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
    const [isPending, setisPending] = useState<Boolean>()
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
    const [favourites, setFavourites] = useState<string[]>([]);

    useEffect(() => {
        const storedFavourites: any[] = JSON.parse(localStorage.getItem("favourites") || "[]");
        setFavourites(storedFavourites.map(fav => fav?.id));
        console.log(storedFavourites)
    }, []);
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
                    console.log(file)
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
            console.log(data.summary)
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

    async function markSummaryAsFavorite() {
        if (!summaryId) return;
        setFavourites((e) => !favourites.includes(summaryId) ? [...e, summaryId] : e.filter(fav => fav != summaryId))
        try {

            const token = Cookies.get("access_token");

            const response = await axios.post(`http://localhost:8000/summary/favorite?summary_id=${summaryId}`, {
                summary_id: summaryId
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                withCredentials: true,
            });

            setFavourites((e) => response.data.status ? [...e, summaryId] : e.filter(fav => fav != summaryId))

            localStorage.setItem("favourites", JSON.stringify(response.data.status ? [...favourites, summaryId] : [...favourites.filter(fav => fav != summaryId)]))
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
        <div className='h-screen w-max-lg flex flex-col items-center justify-center' >
            <div className='flex flex-col gap-3'>

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
                <div className='flex  flex-col justify-center items-center gap-4'>
                    {/* <div className="flex flex-col gap-3 rounded-lg shadow container overflow-y-hidden scrollbar-none items-center justify-center" > */}
                    {/* <div className='flex justify-between p-2 items-center bg-gray-900 rounded-e-lg container '  > */}
                    {/* <div className=' w-max rounded-lg flex gap-3 items-center '>
                            <img src={metadata?.icon} alt="youtube-play--v1 " className=' h-14 rounded-lg' />
                            <span className='flex flex-col'>
                                <h6 className='text-gray-400 text-sm font-bold w-min rounded-xl flex items-center gap-1'>
                                    {metadata?.type}
                                </h6>
                                <h4 className='m-0 truncate text-2xl font-bold text-gray-200' >{metadata?.title?.split(" ").slice(0, 5).join(" ")} {metadata && metadata?.title?.split(" ")?.length > 5 ? '...' : ''}</h4>
                            </span>
                        </div> */}
                    {/* <div className='flex gap-3' >
                            <button className=' p-2 rounded-full text-gray-200' onClick={() => markSummaryAsFavorite()} >
                                <Heart className={`size-8 ${summaryId && favourites.includes(summaryId) ? "fill-red-600 stroke-none" : "fill-transparent"}`} />
                            </button>
                            
                        </div> */}
                    {/* </div> */}
                    <div ref={queriesContainerRef} className='flex flex-col gap-3 rounded-lg shadow max-w-6xl scrollbar-none  scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin scrollbar-track-rounded-full scrollbar-thumb-rounded-full overflow-y-scroll h-[calc(100vh-150px)]' >
                        <div className="bg-gray-900 relative font-mono border-gray-700 text-gray-200  w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
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
                            <button className='text-gray-200 px-2 rounded-full flex gap-2 items-center text-lg justify-center' onClick={() => copyToClipboard(summary?.summarized_summary)} >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                </svg>
                                {text}
                            </button>
                            <button className='text-gray-200  p-2  rounded-full flex gap-2 items-center text-lg' onClick={handleRegenerate} >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`size-6 ${text2 == 'Regenrating . . .' ? 'animate-spin-slow' : ''} `}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>

                                {text2}
                            </button>
                        </div>
                        <div className="flex flex-col gap-5">
                            {queries?.map((query, index) =>
                                <div className={`flex w-full gap-2 text-white ${query.sender == 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {/* <span className={` ${query.sender == 'user' ? 'bg-white/5 justify-end order-2' : 'bg-gray-900'} flex p-1 rounded-full h-min`}>
                                        {
                                            query.sender == 'user' ? <User size={16} /> : <Sparkle size={16} />
                                        }
                                    </span> */}
                                    <div className={`${query.sender == 'user' ? 'bg-white/5 order-1' : 'bg-gray-900'} shadow-sm p-4 rounded-lg gap-2`}>
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
                                    <div className='flex gap-2 text-white items-center'>
                                        {/* <span className='bg-gray-900 flex p-1 rounded-full h-min'>
                                            <Sparkle size={16} />
                                        </span> */}
                                        <Loader2 className='animate-spin' size={16} />
                                    </div>
                                    : null
                            }
                        </div>
                    </div>
                    {/* </div> */}
                </div >
                {/* <div className="flex flex-col gap-3 p-2 w-full fixed bottom-0 left-0 right-0"> */}
                <QueryInput setQueries={setQueries} cancelRecommendations={cancelRecommendations} url={url} setState={setState} id={summaryId} ytRecommendations={ytRecommendations} webRecommendations={webRecommendations} isloading={recommendationLoader} fetchRecommendations={fetchRecommendations}
                />
                {/* </div> */}
            </>
        )
}

export default page

