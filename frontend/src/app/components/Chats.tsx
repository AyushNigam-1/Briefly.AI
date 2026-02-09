"use client"
import React, { Dispatch, KeyboardEvent, SetStateAction, useEffect, useRef, useState } from 'react'
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
import { useQuery } from "@tanstack/react-query";
import QueryInput from '@/app/components/QueryInput';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import Loader from '@/app/components/Loader';
import { Copy, Ellipsis, Heart, Loader2, RefreshCw, Sparkle, Sparkles, User } from 'lucide-react';

const getChats = async (summaryId: string) => {
    try {
        const token = Cookies.get("access_token");
        const response = await axios.get(`http://localhost:8000/summary/?id=${summaryId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data.summary;
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
interface ChatsProps {
    queries: query[];
    setQueries: Dispatch<SetStateAction<query[]>>;
    isPending: boolean;
    handleSend: (query: string) => Promise<void>;
}
const Chats = ({ queries, setQueries, isPending, handleSend }: ChatsProps) => {

    const [isLoading, setLoading] = useState<boolean>(false);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<ProgressResponse>();
    const [metadata, setMetadata] = useState<Metadata | undefined>(undefined)
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
    const inputRef = useRef<HTMLInputElement>(null);
    // const 
    // useEffect(() => {
    //     const storedFavourites: any[] = JSON.parse(localStorage.getItem("favourites") || "[]");
    //     setFavourites(storedFavourites.map(fav => fav?.id));
    //     console.log(storedFavourites)
    // }, []);

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

    // const fetchRecommendations = async (scriptId?: string) => {
    //     setRecommendationLoader(true);

    //     if (cancelTokenSource) {
    //         cancelTokenSource.abort();
    //     }

    //     cancelTokenSource = new AbortController();

    //     try {
    //         const token = Cookies.get("access_token");
    //         if (!token) {
    //             throw new Error("Unauthorized: No access token found");
    //         }

    //         const response = await axios.get(
    //             `http://localhost:8000/summary/recommendations/?summary_id=${scriptId}`,
    //             {
    //                 headers: { Authorization: `Bearer ${token}` },
    //                 signal: cancelTokenSource.signal,
    //             }
    //         );

    //         console.log("Full API Response:", response.data);

    //         if (!response.data || typeof response.data !== "object") {
    //             throw new Error("Invalid response format: response data is not an object");
    //         }

    //         if (!response.data.recommendations || typeof response.data.recommendations !== "string") {
    //             throw new Error("Invalid response format: recommendations field missing or not a string");
    //         }

    //         let recommendations = response.data.recommendations.replace(/```json|```/g, "").trim();

    //         try {
    //             const data = JSON.parse(recommendations);
    //             console.log("Parsed Data:", data);

    //             if (!data.youtube || !data.website) {
    //                 throw new Error("Missing expected recommendation data");
    //             }

    //             setytRecommendations(data.youtube);
    //             setWebRecommendations(data.website);
    //         } catch (jsonError) {
    //             console.error("Error parsing recommendations JSON:", jsonError);
    //             throw new Error("Failed to parse recommendations JSON");
    //         }
    //     } catch (error: any) {
    //         if (axios.isCancel(error)) {
    //             console.log("Request canceled:", error.message);
    //         } else if (error.response) {
    //             console.error("Server error:", error.response.status, error.response.data);
    //         } else {
    //             console.error("Unexpected error fetching recommendations:", error.message || error);
    //         }
    //     } finally {
    //         setRecommendationLoader(false);
    //     }
    // };



    // const handleRegenerate = async () => {
    //     setText2('Regenrating . . .')
    //     try {
    //         const { data } = await axios.post(`http://localhost:8000/regenerate_summary?id=${summaryId}&language=${language}&format=${format}`)
    //         console.log(data)
    //         setSummary(data)
    //     } catch (err) {
    //         // setError(err.message);
    //     } finally {
    //         setText2("Regenrate");
    //     }
    // };

    // const getSummary = async (url?: string, lang?: string, format?: string, title?: string, icon?: string) => {
    //     console.log("called getSummary")
    //     setLoading(true);
    //     try {
    //         const token = Cookies.get("access_token");

    //         let file: File | null = null;

    //         if (url) {
    //             const decodedUrl = decodeURIComponent(url);

    //             const isLocalFile = decodedUrl.startsWith("blob:") || decodedUrl.startsWith("file:");

    //             if (isLocalFile) {
    //                 const response = await fetch(decodedUrl);
    //                 if (!response.ok) {
    //                     throw new Error("Failed to fetch the file from the provided URL.");
    //                 }
    //                 const blob = await response.blob();
    //                 file = new File([blob], title || "uploaded_file", { type: blob.type });
    //                 console.log(file)
    //             } else {
    //                 const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    //                 if (!urlRegex.test(decodedUrl)) {
    //                     throw new Error("Invalid URL provided.");
    //                 }
    //             }
    //         }
    //         const formData = new FormData();
    //         if (url) formData.append("url", url);
    //         if (file) formData.append("file", file);
    //         if (lang) formData.append("lang", lang);
    //         if (format) formData.append("format", format);
    //         if (title) formData.append("title", title);
    //         if (icon) formData.append('icon', icon)

    //         const { data } = await axios.post(
    //             "http://localhost:8000/summarize/",
    //             formData,
    //             {
    //                 headers: {
    //                     "Authorization": `Bearer ${token}`,
    //                     "Content-Type": "multipart/form-data",
    //                 },
    //                 withCredentials: true,
    //             }
    //         );
    //         console.log("data", data)
    //         const preview_url = await previewFile(data.summary.thumbnail)
    //         console.log(preview_url)
    //         setMetadata({ icon: preview_url, title: data.summary.title, type: data.summary.type })
    //         setSummaryId(data.summary.id)

    //         // setSummary(data.summary);
    //         console.log(data.summary)
    //         setQueries(data.summary.queries);
    //         // fetchRecommendations(data.summary.id)
    //     } catch (error) {
    //         if (axios.isAxiosError(error)) {
    //             throw new Error(error.response?.data?.message || error.message);
    //         } else {
    //             throw new Error(String(error));
    //         }
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // async function markSummaryAsFavorite() {
    //     if (!summaryId) return;
    //     setFavourites((e) => !favourites.includes(summaryId) ? [...e, summaryId] : e.filter(fav => fav != summaryId))
    //     try {

    //         const token = Cookies.get("access_token");

    //         const response = await axios.post(`http://localhost:8000/summary/favorite?summary_id=${summaryId}`, {
    //             summary_id: summaryId
    //         }, {
    //             headers: {
    //                 "Authorization": `Bearer ${token}`,
    //             },
    //             withCredentials: true,
    //         });

    //         setFavourites((e) => response.data.status ? [...e, summaryId] : e.filter(fav => fav != summaryId))

    //         localStorage.setItem("favourites", JSON.stringify(response.data.status ? [...favourites, summaryId] : [...favourites.filter(fav => fav != summaryId)]))
    //     } catch (error: any) {
    //         console.error('Error:', error.response?.data?.detail || error.message);
    //         return { error: error.response?.data?.detail || 'Failed to mark summary as favorite' };
    //     }
    // }

    // const cancelRecommendations = () => {
    //     if (cancelTokenSource) {
    //         cancelTokenSource.abort();
    //         console.log("Fetch request canceled.");
    //     }
    // };

    // useEffect(() => {
    //     if (summary) return
    //     connectWebSocket("ws://127.0.0.1:8000/ws")
    //     if (id) {
    //         setSummaryId(id)e.key === "Enter" && e.currentTarget.value.trim(
    //         // fetchRecommendations(id)
    //     }
    //     else {
    //         // getSummary(url, language, format, title, icon);
    //     }
    // }, []);

    const {
        data: summary,
        // isLoading,
        isError,
    } = useQuery({
        queryKey: ["summary", summaryId],
        queryFn: async () => await getChats(summaryId!),
        enabled: !!summaryId, // prevents firing when undefined
    });

    // useEffect(() => {
    //     if (!summaryId) return;
    //     const fetchData = async () => {
    //         setLoading(true);
    //         try {
    //             const data = await fetchExisitingSummary(summaryId);
    //             const thumbnail = await previewFile(data.summary.thumbnail)
    //             console.log(data)
    //             setMetadata({ icon: thumbnail, title: data.summary.title, type: data.summary.type })
    //             setSummary(data.summary);
    //             setQueries(data.summary.queries)
    //             // fetchRecommendations(data.summary.id)
    //         } catch (error) {
    //             console.error("Failed to fetch summary:", error);
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchData();
    // }, [summaryId]);

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

    if (isLoading) return <div className='h-screen w-max-lg flex flex-col items-center justify-center' >
        <div className='flex flex-col gap-3'>
            <HashLoader
                color={"#ffffff"}
                loading={isLoading}
                size="100"
                aria-label="Loading Spinner"
                data-testid="loader" />
        </div>
    </div>

    return <>
        {/* Main Container: Full width, centered content area */}
        <div className='flex flex-col items-center w-full h-[calc(100vh-160px)]'>
            {/* Scrollable Chat Area */}
            <div
                ref={queriesContainerRef}
                className='w-full max-w-6xl overflow-y-auto scrollbar-none'
            >
                <div className="flex flex-col gap-6 py-4">
                    {queries?.map((query, index: number) => (
                        <div
                            key={index}
                            className={`flex w-full ${query.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex flex-col gap-2 max-w-[80%] ${query.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-2xl text-white shadow-sm ${query.sender === 'user'
                                    ? 'bg-white/10 rounded-br-none'
                                    : 'bg-gray-900 rounded-bl-none'
                                    }`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>,
                                            ol: ({ children }) => <ul className="list-decimal ml-5">{children}</ul>
                                        }}
                                    >
                                        {query.content}
                                    </ReactMarkdown>
                                </div>

                                {/* Action Buttons (Copy/Regenerate) */}
                                <div className="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => copyToClipboard(query?.content)}
                                        className="p-1 hover:text-white text-gray-400 transition-colors"
                                        title="Copy"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    {query.sender !== 'user' && (
                                        <button
                                            className="p-1 hover:text-white text-gray-400 transition-colors"
                                            title="Regenerate"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* Loading Indicator */}
                    {isPending && (
                        <div className="flex justify-start w-full">
                            <div className="bg-gray-900 p-4 rounded-2xl rounded-bl-none">
                                <Ellipsis className='animate-bounce text-white' size={24} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex max-w-6xl my-2 mx-auto rounded-lg bg-white/5 py-5">
            <span className=" text-gray-200 pl-3 rounded-s-lg ">
                <Sparkle />
            </span>
            <input type="text" onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => (e.key === "Enter" && e.currentTarget.value.trim()) && handleSend(e.currentTarget.value)} placeholder='Ask AI' className='appearance-none border-none outline-none bg-transparent p-2 w-full h-14' />
            {/* <input
                type="text"
                ref={inputRef}
                onKeyDown={handleKeyDown}
                className=" w-full bg-transparent  rounded-e-lg pl-3 outline-none  text-gray-200"
                placeholder="Ask AI"
            /> */}
        </div>
        {/* Input Area */}
        {/* <QueryInput
            setQueries={setQueries}
            url={url}
            setState={setState}
            id={summaryId}
            ytRecommendations={ytRecommendations}
            webRecommendations={webRecommendations}
            isloading={recommendationLoader}
        /> */}
    </>

}

export default Chats

