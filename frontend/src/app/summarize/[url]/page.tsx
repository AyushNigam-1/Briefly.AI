"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { SummaryResponse, query } from '@/app/types';
import { setupWebSocketListeners } from '@/websocket/webEvent';
import CircularLoader from '@/app/components/ProgressBar';
import { connectWebSocket } from "@/websocket/websocket";
import BarLoader from "react-spinners/ClipLoader";

const page = () => {

    const [queries, setQueries] = useState<query[]>([]);
    const [isLoading, setLoading] = useState<boolean>(false);
    const [summary, setSummary] = useState<SummaryResponse | undefined>();
    const [progress, setProgress] = useState(0);
    const searchParams = useSearchParams();
    const params = useParams();
    const url = params?.url as string;
    const title = searchParams.get('title') as string;
    const language = searchParams.get('language') as string
    const format = searchParams.get('format') as string;
    console.log(language, format, url)
    const getSummary = async (url?: string, lang?: string, format?: string, title?: string) => {
        setLoading(true);
        try {
            const token = Cookies.get("access_token");
            const { data } = await axios.get(`http://localhost:8000/summarize/?url=${url}&format=${format}&lang=${lang}&title=${title}`
                ,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                    withCredentials: true,
                }
            );
            setSummary(data.summary);
            setQueries(data.summary.queries)
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || error.message);
            } else {
                throw new Error(String(error));
            }
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        connectWebSocket("ws://127.0.0.1:8000/ws")
        getSummary(url, language, format, title);
    }, []);

    // useEffect(() => {
    //     setupWebSocketListeners({
    //         onOpen: () => console.log("WebSocket connection established in EventListenerComponent"),
    //         onMessage: (data) => setProgress(data.progress),
    //         onClose: () => console.log("WebSocket connection closed in EventListenerComponent"),
    //         onError: (error) => console.error("WebSocket error:", error),
    //     });
    // }, []);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    return isLoading ?
        <div className='h-screen w-screen flex items-center justify-center' >
            <BarLoader
                color={"#ffffff"}
                loading={isLoading}
                size={25}
                aria-label="Loading Spinner"
                data-testid="loader" />
        </div>
        : (
            <div>
                {format}
                {language}
                <div className='w-28' >

                </div>
            </div>
        )

}

export default page