"use client"
import React, { Dispatch, KeyboardEvent, SetStateAction, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { Metadata, ProgressResponse, query, webRecommendations, ytRecommendations } from '@/app/types';
import { setupWebSocketListeners } from '@/websocket/webEvent';
import HashLoader from "react-spinners/HashLoader"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import { useQuery } from "@tanstack/react-query";
import { Copy, Ellipsis, Loader2, Paperclip, RefreshCw, SendHorizontal } from 'lucide-react';
// 1. Import Framer Motion
import { motion, AnimatePresence } from "framer-motion";
import InputBox from './InputBox';

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
    query: string;
    setQuery: (value: string) => void
}

const Chats = ({ queries, setQueries, isPending, handleSend, query, setQuery }: ChatsProps) => {

    const [isLoading, setLoading] = useState<boolean>(false);
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<ProgressResponse>();
    const [metadata, setMetadata] = useState<Metadata | undefined>(undefined)
    const searchParams = useSearchParams();
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
    const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const copyToClipboard = async (text?: string) => {
        if (text)
            try {
                await navigator.clipboard.writeText(text);
                console.log('Text copied to clipboard');
                setText('Copied!')
                setTimeout(() => {
                    setText('Copy')
                }, 2000)
                return true;
            } catch (err) {
                console.error('Failed to copy text: ', err);
                return false;
            }
    };

    const {
        data: summary,
        isError,
    } = useQuery({
        queryKey: ["summary", summaryId],
        queryFn: async () => await getChats(summaryId!),
        enabled: !!summaryId,
    });

    useEffect(() => {
        if (queriesContainerRef.current) {
            queriesContainerRef.current.scrollTo({
                top: queriesContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [queries, isPending]); // Added isPending to auto-scroll when loader appears

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
        {/* Main Container */}
        <div className='flex flex-col items-center w-full h-[calc(100vh-140px)] '>
            {/* Scrollable Chat Area */}
            <div
                ref={queriesContainerRef}
                className='w-full  overflow-y-auto scrollbar-none max-w-6xl'
            >
                <div className="flex flex-col gap-6 py-4">
                    {/* 2. AnimatePresence enables exit animations and clean DOM updates */}
                    <AnimatePresence mode='popLayout'>
                        {queries?.map((query, index: number) => (
                            // 3. Turn div into motion.div
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className={`flex w-full ${query.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex flex-col gap-2 max-w-[80%] ${query.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 rounded-2xl shadow-sm ${query.sender === 'user'
                                        ? 'bg-primary text-secondary'
                                        : 'text-primary bg-white/5 border-gray-800 border'
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

                                    {/* Action Buttons */}
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
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* 4. Animate the Pending Loader */}
                    <AnimatePresence>
                        {isPending && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex justify-start w-full"
                            >
                                <div className="bg-gray-900 p-4 rounded-2xl rounded-bl-none">
                                    <Ellipsis className='animate-bounce text-white' size={24} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        <div className='max-w-6xl mx-auto' >
            <InputBox query={query} setQuery={setQuery} send={handleSend} isPending={isPending} />
        </div>

        {/* Input Area */}
        {/* <div className='flex gap-4 w-full items-end max-w-6xl mx-auto text-gray-100 pt-4'>
            <span className=' w-full space-y-2 '>
                <div className='flex gap-2 bg-white/5  rounded-full '>
                    <button className='bg-gray-900 rounded-full p-4 flex items-center justify-center'>
                        <input type="file" className="hidden"
                            accept=".pdf,.txt,image/*,video/*"
                            multiple />
                        <Paperclip size="20" />
                    </button>
                    <input type="text"
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { handleSend(e.currentTarget.value); inputRef.current!.value = ""; } }}
                        ref={inputRef}
                        placeholder='Ask AI' className='appearance-none border-none outline-none bg-transparent p-2 w-full h-14' />
                </div>
            </span>
            <button
                onClick={() => { handleSend(inputRef.current?.value!); inputRef.current!.value = ""; }}
                className=" rounded-full bg-gray-900 flex items-center justify-center hover:scale-105 transition-transform duration-200">
                <div className=" rounded-full p-4 flex items-center justify-center">
                    {isPending ? <Loader2 className='animate-spin' size="20" /> : <SendHorizontal size="20" />}
                </div>
            </button>
        </div> */}
    </>

}

export default Chats