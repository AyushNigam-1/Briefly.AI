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
import { motion, AnimatePresence } from "framer-motion";
import InputBox from './InputBox';
import SourcesSidebar from './panels/SourcesPanel';
import Messages from './Messages';

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
    isPending: boolean; // Using this to detect if we are waiting/streaming
    handleSend: (query: string, files: File[], modal: string) => Promise<void>;
    query: string;
    setQuery: (value: string) => void
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    handleStop: () => void
    files: File[],
    setFiles: (e: File) => void
}

const Chats = ({ queries, setQueries, isPending, handleSend, query, setQuery, files, handleFileChange, handleStop, setFiles }: ChatsProps) => {
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

    useEffect(() => {
        if (queriesContainerRef.current) {
            queriesContainerRef.current.scrollTo({
                top: queriesContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [queries, isPending]);

    useEffect(() => {
        setupWebSocketListeners({
            onOpen: () => console.log("WebSocket connection established"),
            onMessage: (data) => setProgress(data),
            onClose: () => console.log("WebSocket connection closed"),
            onError: (error) => console.error("WebSocket error:", error),
        });
    }, []);

    if (isLoading) return (
        <div className='h-screen w-max-lg flex flex-col items-center justify-center' >
            <div className='flex flex-col gap-3'>
                <HashLoader color={"#ffffff"} loading={isLoading} size="100" />
            </div>
        </div>
    );

    return <>
        <div className='flex flex-col items-center w-full h-[calc(100vh-140px)]'>
            <div ref={queriesContainerRef} className='w-full overflow-y-auto scrollbar-none max-w-6xl'>
                <div className="flex flex-col gap-6 py-4">

                    <AnimatePresence mode='popLayout'>
                        {queries?.map((q, index: number) => {
                            const isLastAI = index === queries.length - 1 && q.sender !== 'user';
                            const isStreaming = isLastAI && isPending;
                            if (!q.content) return;
                            return (
                                <motion.div
                                    key={index}
                                    layout="position"
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{
                                        opacity: { duration: 0.3 },
                                        y: { duration: 0.3 },
                                        layout: {
                                            type: "spring",
                                            bounce: 0.15,
                                            duration: 0.5
                                        }
                                    }}
                                    className={`flex w-full ${q.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <Messages q={q} isStreaming={isStreaming} />
                                </motion.div>
                            );
                        })}

                    </AnimatePresence>

                    {/* 🌟 Pending Loader */}
                    <AnimatePresence>
                        {isPending && !queries[queries.length - 1]?.content && (
                            <div className="p-4 rounded-2xl flex items-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] bg-slate-400 dark:bg-gray-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] bg-slate-400 dark:bg-gray-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-slate-400 dark:bg-gray-400"></div>
                            </div>
                        )}
                    </AnimatePresence>

                </div>
            </div>
        </div>

        <div className='max-w-6xl mx-auto'>
            <InputBox query={query} setQuery={setQuery} send={handleSend} isPending={isPending} files={files} setFiles={setFiles} handleFileChange={handleFileChange} stop={handleStop} />
        </div>

        <SourcesSidebar isOpen={sourcesOpen} onClose={() => setSourcesOpen(false)} sources={sources} />
    </>
}

export default Chats