"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Dropdown from "../components/Dropdown";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryResponse {
    summary: string;
}

interface Language {
    code: string;
    name: string;
}

interface Tone {
    value: string;
    label: string;
}

const languages: Language[] = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
];

const tones: Tone[] = [
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "technical", label: "Technical" },
    { value: "humorous", label: "Humorous" },
    { value: "concise", label: "Concise" },
];

const fetchSummary = async (url: string, lang: string, tone: string): Promise<SummaryResponse> => {
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
    const url = params?.url as string; // Ensure URL is a string
    const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
    const [selectedTone, setSelectedTone] = useState<string>("formal");

    const key = url ? [url, selectedLanguage, selectedTone] : null;

    const { data, error } = useSWR<SummaryResponse>(key,
        () => fetchSummary(url, selectedLanguage, selectedTone),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            refreshWhenHidden: false,
        }
    );

    const loading = !data && !error;

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLanguage(e.target.value);
    };

    const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTone(e.target.value);
    };

    return (
        <div className="gap-3 flex justify-center items-center h-[100vh] w-[100vw]">
            {loading ? (
                <div className="flex-col gap-4 w-full flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-transparent text-blue-400 text-4xl animate-spin flex items-center justify-center border-t-blue-400 rounded-full">
                        <div className="w-16 h-16 border-4 border-transparent text-red-400 text-2xl animate-spin flex items-center justify-center border-t-red-400 rounded-full"></div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6 p-4 rounded-lg shadow w-[70%] h-[70%] z-50">
                    <div className="flex justify-between">
                        <p className="text-3xl font-mono">Summary</p>
                        <div className="flex gap-4">
                            <Dropdown />
                            <Dropdown />
                        </div>
                    </div>
                    {error ? (
                        <p className="text-red-500">{error.message}</p>
                    ) : (
                        <div className="bg-gray-900/70 font-mono overflow-y-scroll scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thin w-100 p-4 rounded-lg prose-gray prose-lg w-full max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>
                                }}
                            >
                                {data?.summary}
                            </ReactMarkdown>
                        </div>
                    )}
                    <div className="gap-2 flex ">
                        <button className=" flex gap-1 shadow-sm ring-1 items-center bg-gray-900/70 px-3 py-2  rounded-lg" > <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                            Copy </button>
                        <button className="shadow-sm ring-1 flex gap-1 items-center bg-gray-900/70 px-3 py-2 rounded-lg" > <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                            Regenerate </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SummaryPage;
