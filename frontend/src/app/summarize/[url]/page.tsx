"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { SummaryResponse, query } from '@/app/types';
import { io } from "socket.io-client";
const page = () => {

    const [queries, setQueries] = useState<query[]>([]);
    const [isLoading, setLoading] = useState<boolean>(false);
    const [summary, setSummary] = useState<SummaryResponse | undefined>();
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
        getSummary(url, language, format, title);
    }, []);
    useEffect(() => {
        const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    
        ws.onopen = () => {
          console.log("WebSocket connection established");
        };
    
        ws.onmessage = (event) => {
            console.log(JSON.parse(event.data))
        //   setMessages((prev) => [...prev, event.data]);
        };
    
        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };
    
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        return () => {
          ws.close();
        };
      }, []);
    
    
    return (
        <div>
            {format}
            {language}
        </div>
    )
}

export default page