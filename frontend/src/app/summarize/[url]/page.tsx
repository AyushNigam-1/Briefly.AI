"use client"
import React, { useEffect, useState } from 'react'
import { useParams , useSearchParams } from "next/navigation";
import axios from 'axios';
import Cookies from 'js-cookie';
import { SummaryResponse , query } from '@/app/types';
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
    console.log(language,format,url)


    const fetchSummary = async (url?: string, lang?: string, format?: string, title?: string) => {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(`http://localhost:8000/summarize/?url=${url}&format=${format}&lang=${lang}&title=${title}`
            , 
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                withCredentials: true,
            }
        );
            console.log(response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || error.message);
            } else {
                throw new Error(String(error));
            }
        }
    };
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchSummary(url, language , format, title);
                setSummary(data.summary);
                setQueries(data.summary.queries)
                console.log(data)
            } catch (error) {
                console.error("Failed to fetch summary:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div>{format}
            
            {language}</div>
    )
}

export default page