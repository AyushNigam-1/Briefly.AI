"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Dropdown from "../components/Dropdown";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ErrorPage from "../components/ErrorPage";
import Loading from "../components/Loading";
import QueryInput from "../components/QueryInput";
// import loader from '.'
import { query } from "@/app/types";
interface SummaryResponse {
    summary: string;
}

interface props {
    value?: string;
    label?: string;
}

const languages: props[] = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "zh", label: "Chinese" },
];

const tones: props[] = [
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "technical", label: "Technical" },
    { value: "humorous", label: "Humorous" },
    { value: "concise", label: "Concise" },
];

const fetchSummary = async (url?: string, lang?: string, tone?: string): Promise<SummaryResponse> => {
    const response = await fetch(
        `http://localhost:8000/summarize/?url=${url}&lang=${lang}&tone=${tone}`
    );

    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
};

const SummaryPage: React.FC = () => {
    const params = useParams();
    const url = params?.url as string;
    const [selectedLanguage, setSelectedLanguage] = useState<props | undefined>(languages[0]);
    const [selectedTone, setSelectedTone] = useState<props | undefined>(tones[0]);
    const [queries, setQueries] = useState<query[]>([])
    const [isLoading, setLoading] = useState<boolean>(false)
    const queriesContainerRef = useRef<HTMLDivElement | null>(null);
    const key = url ? [url, selectedLanguage, selectedTone] : null;


    const { data, error } = useSWR<SummaryResponse>(key,
        () => fetchSummary(url, selectedLanguage?.value, selectedTone?.value),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            refreshWhenHidden: false,
        }
    );

    const loading = !data && !error;
    useEffect(() => {
        if (queriesContainerRef.current) {
            queriesContainerRef.current.scrollTop = queriesContainerRef.current.scrollHeight + 10;
        }
    }, [queries]);

    if (error) return <ErrorPage />

    if (loading) return <Loading />

    return (
        <div className="gap-3 flex items-center justify-center flex-col max-h-[100vh] max-w-[100vw] p-4">
            <div className="flex flex-col gap-3 rounded-lg shadow w-[75%] z-50 overflow-y-scroll scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin" ref={queriesContainerRef}>
                <div className="bg-gray-900/70 font-mono scrollbar-thumb-gray-500  w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                        }}
                    >
                        {data?.summary}
                    </ReactMarkdown>
                </div>
                <div className="max-h-60 flex flex-col gap-3"> {/* Use the ref for scrolling */}
                    {queries.length ? queries.map((query, index) => (
                        <div key={index} className="bg-gray-900/70 p-4 rounded-lg font-mono flex gap-2">
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
                    )) : ""}
                    {
                        isLoading ?
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
            <QueryInput setQueries={setQueries} url={url} setLoading={setLoading} />
        </div >

    );
};

export default SummaryPage;
