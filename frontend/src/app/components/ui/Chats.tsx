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
import { Copy, Ellipsis, FileText, ImageIcon, Link, Loader2, Paperclip, RefreshCw, SendHorizontal, VideoIcon, X } from 'lucide-react';
// 1. Import Framer Motion
import { motion, AnimatePresence } from "framer-motion";
import InputBox from './InputBox';
import SourcesSidebar from './panels/SourcesPanel';

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
    handleSend: (query: string, files: File[]) => Promise<void>;
    query: string;
    setQuery: (value: string) => void
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    files: File[],
    setFiles: (e: File) => void
}

const Chats = ({ queries, setQueries, isPending, handleSend, query, setQuery, files, handleFileChange, setFiles }: ChatsProps) => {
    console.log("queries", queries)
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
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const [sources, setSources] = useState<any[]>([]);
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
                                    <div className='space-y-2' >
                                        {
                                            query?.files?.length != 0 &&
                                            <div className="flex gap-3 overflow-x-auto justify-end scrollbar-none animate-in fade-in slide-in-from-bottom-2">
                                                {query.files?.map((file, index) => (
                                                    <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                                                        <div className='p-2 pr-6 flex gap-2  bg-tertiary text-primary rounded-xl relative border border-secondary'>
                                                            {/* Icon based on file type */}
                                                            <div className='p-3 rounded-full bg-primary my-auto text-secondary'>
                                                                {file.type.startsWith("image/") ?
                                                                    <ImageIcon size={20} /> : file.type.startsWith("video/") ?
                                                                        <VideoIcon size={20} /> : <FileText size={20} />
                                                                }
                                                            </div>

                                                            <div className='flex gap-1 flex-col'>
                                                                <h1 className='font-semibold truncate'>
                                                                    {file.name.slice(0, 14)}
                                                                </h1>
                                                                <p className='text-sm text-start'>
                                                                    {file.size >= 1048576
                                                                        ? (file.size / 1048576).toFixed(2) + ' MB'
                                                                        : (file.size / 1024).toFixed(2) + ' KB'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Remove Button (X) */}

                                                    </div>
                                                ))}
                                            </div>
                                        }
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            className={`p-4 rounded-xl shadow-sm leading-relaxed space-y-3 max-w-[720px] font-mono ${query.sender === "user"
                                                ? "bg-primary text-secondary ml-auto "
                                                : "text-primary bg-tertiary border border-gray-800 "
                                                }`}
                                            components={{
                                                p: ({ children }) => (
                                                    <p className="leading-6 ">{children}</p>
                                                ),

                                                ul: ({ children }) => (
                                                    <ul className="list-disc ml-5 space-y-2 ">{children}</ul>
                                                ),

                                                ol: ({ children }) => (
                                                    <ol className="list-decimal ml-5 space-y-2 ">{children}</ol>
                                                ),

                                                li: ({ children }) => (
                                                    <li className="leading-6">{children}</li>
                                                ),

                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-primary pl-4 italic text-gray-400 my-2">
                                                        {children}
                                                    </blockquote>
                                                ),

                                                // code: ({ inline, children }) =>
                                                //     inline ? (
                                                //         <code className="bg-white/10 px-1.5 py-0.5 rounded">
                                                //             {children}
                                                //         </code>
                                                //     ) : (
                                                //         <pre className="bg-black/40 p-3 rounded-xl overflow-x-auto my-2">
                                                //             <code>{children}</code>
                                                //         </pre>
                                                //     ),

                                                strong: ({ children }) => (
                                                    <strong className="">{children}</strong>
                                                ),
                                            }}
                                        >
                                            {query.content}
                                        </ReactMarkdown>

                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 justify-between w-full">

                                        <div className='flex gap-2 opacity-50 hover:opacity-100 transition-opacity'>
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
                                        {
                                            query.sources?.length ? <button
                                                onClick={() => { setSources(query.sources!); setSourcesOpen(true) }}
                                                className=" hover:text-white text-gray-400 transition-colors flex gap-2 items-center"
                                                title="Copy"
                                            >
                                                <Link size={16} />
                                                Sources
                                            </button> : ""
                                        }
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
                                <div className="bg-tertiary border border-secondary p-4 rounded-2xl flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        <div className='max-w-6xl mx-auto' >
            <InputBox query={query} setQuery={setQuery} send={handleSend} isPending={isPending} files={files} setFiles={setFiles} handleFileChange={handleFileChange} />
        </div>
        <SourcesSidebar
            isOpen={sourcesOpen}
            onClose={() => setSourcesOpen(false)}
            sources={sources}
        />

    </>

}

export default Chats