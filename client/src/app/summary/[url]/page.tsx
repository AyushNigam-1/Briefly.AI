"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Dropdown from "../components/Dropdown";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ErrorPage from "../components/ErrorPage";
import Loading from "../components/Loading";
import QueryInput from "../components/QueryInput";
// import loader from '.'
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
    const [queries, setQueries] = useState<string[]>([])
    const [isLoading, setLoading] = useState<boolean>(false)
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

    if (error) return <ErrorPage />

    if (loading) return <Loading />

    return (
        <div className="gap-3 flex justify-center items-center h-[100vh] w-[100vw]">
            <div className="flex flex-col gap-6 p-4 rounded-lg shadow w-[70%] h-[95%] z-50 overflow-y-scroll scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin">
                <div className="flex justify-between">
                    <div className="gap-4 flex text-base">
                        <button className=" flex gap-1 shadow-sm ring-1 items-center bg-gray-900/70 px-4 py-2  rounded-lg" > <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                            Copy </button>
                        <button className="shadow-sm ring-1 flex gap-1 items-center bg-gray-900/70 px-4 py-2 rounded-lg" > <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                            Regenerate </button>
                    </div>
                    <div className="flex gap-4">
                        <Dropdown icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                        </svg>} options={languages} setOption={(option?: props) => {
                            setSelectedLanguage(option);
                        }} selectedOption={selectedLanguage}
                        />
                        <Dropdown icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>} options={tones} setOption={(option?: props) => {
                            setSelectedTone(option);
                        }} selectedOption={selectedTone} />
                    </div>
                </div>

                <div className="bg-gray-900/70 font-mono  scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                        }}
                    >
                        {data?.summary}
                    </ReactMarkdown>
                </div>
                {queries.length ? queries.map(query =>
                    <div className="bg-gray-900/70 p-4 rounded-lg font-mono flex gap-2 " >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 w-max">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        <div>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                                }}
                            >
                                {query}
                            </ReactMarkdown>
                        </div>
                    </div>) : ""}
                {
                    isLoading ?
                        <div className="bg-gray-900/70 p-4 rounded-lg font-mono flex gap-2 items-center" >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                            </svg>
                            <svg fill="currentColor" height="30" width="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite" /></circle><circle cx="12" cy="12" r="3"><animate attributeName="r" dur="0.75s" values="3;1.5;3" repeatCount="indefinite" /></circle><circle cx="20" cy="12" r="1.5"><animate attributeName="r" dur="0.75s" values="1.5;3;1.5" repeatCount="indefinite" /></circle></svg>
                        </div>
                        : null
                }
                <QueryInput setQueries={setQueries} url={url} setLoading={setLoading} />

            </div>

        </div>
    );
};

export default SummaryPage;
