"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ErrorPage from "../../components/ErrorPage";
import Loading from "../../components/Loading";
import QueryInput from "../../components/QueryInput";
import Cookies from "js-cookie";
import axios from "axios";
import { query } from "@/app/types";
import Sidebar from "../../components/Sidebar";
import Navbar from "@/app/components/Navbar";

interface SummaryResponse {
    summarized_summary: string;
    id: string;
    queries: query[] | [];
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
const fetchSummary = async (url?: string, lang?: string, tone?: string, title?: string) => {
    try {
        const token = Cookies.get("access_token");
        const response = await axios.get(`http://localhost:8000/summarize/?url=${url}&lang=${lang}&tone=${tone}&title=${title}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            withCredentials: true,
        });
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




const SummaryPage: React.FC = () => {
    const params = useParams();
    const url = params?.url as string;
    const title = params?.title as string;
    const [selectedLanguage, setSelectedLanguage] = useState<props | undefined>(languages[0]);
    const [selectedTone, setSelectedTone] = useState<props | undefined>(tones[0]);
    const [queries, setQueries] = useState<query[]>([]);
    const [isLoading, setLoading] = useState<boolean>(false);
    const queriesContainerRef = useRef<HTMLDivElement | null>(null);
    const key = url ? [url, selectedLanguage, selectedTone] : null;
    const [summary, setSummary] = useState<SummaryResponse | undefined>();
    const [summaryId, setSummaryId] = useState<string | undefined>(undefined);
    const [state, setState] = useState<string | undefined>(undefined)
    // const { data, error } = useSWR<SummaryResponse>(key,
    //     () => fetchSummary(url, selectedLanguage?.value, selectedTone?.value , title),
    //     {
    //         revalidateOnFocus: false,
    //         dedupingInterval: 60000,
    //         refreshWhenHidden: false,
    //     }
    // );

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchSummary(url, selectedLanguage?.value, selectedTone?.value, title);
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

    useEffect(() => {
        if (!summaryId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchExisitingSummary(summaryId);
                console.log(data)
                setSummary(data.summary);
                setQueries(data.summary.queries)
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


    const handleDownload = async (summaryId: string | undefined, type: "original_summary" | "summarized_summary"): Promise<void> => {
        try {
            const response = await axios.get(`http://localhost:8000/download/`, {
                params: { summary_id: summaryId, type },
                responseType: "blob",
            });

            const blob = new Blob([response.data], { type: "text/plain" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${type}_${summaryId}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading the summary:", error);
            alert("Failed to download the summary.");
        }
    };

    // if (error) return <ErrorPage />;
    if (isLoading) return <Loading />;

   
    return (
        <div className="gap-1 flex items-center justify-center flex-col max-h-[100vh] max-w-[100vw]">
            <Navbar component={<Sidebar setId={setSummaryId} />} />
            <div className="flex flex-col gap-3 rounded-lg shadow container overflow-y-scroll mb-20 scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin" ref={queriesContainerRef}>
             {/* <div className="flex justify-center gap-4 mt-4"> */}
        {/* <button
            onClick={() => handleDownload(summary?.id, "original_summary")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
            Download Original Summary
        </button> */}
        {/* <button
            onClick={() => handleDownload(data?.summary?.id, "summarized_summary")}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
            Download Summarized Summary
        </button> */}
    {/* </div> */}
                <div className="bg-gray-900/70 font-mono border-gray-700 scrollbar-thumb-gray-500  w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                        }}
                    >
                        {summary?.summarized_summary}
                    </ReactMarkdown>
                </div>
                <div className="max-h-60 flex flex-col gap-3">
                    {queries?.map((query, index) =>
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
            <div className="flex flex-col gap-3 p-2 w-full fixed bottom-0 left-0 right-0">
                <QueryInput setQueries={setQueries} url={url} setState={setState} id={summary?.id} />
            </div>
        </div >
    );
};

export default SummaryPage;
