"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";

const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
];

const tones = [
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "technical", label: "Technical" },
    { value: "humorous", label: "Humorous" },
    { value: "concise", label: "Concise" },
];

const SummaryPage = () => {
    const params = useParams();
    const url = params?.url as string;
    const [summary, setSummary] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
    const [selectedTone, setSelectedTone] = useState<string>("formal");

    const fetchSummary = async (lang: string, tone: string) => {
        try {
            const response = await fetch(
                `http://localhost:8000/summarize/?url=${url}&lang=${lang}&tone=${tone}`
            );
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const data = await response.json();
            setSummary(data.summary);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!url) {
            setError("URL parameter is missing.");
            setLoading(false);
            return;
        }
        fetchSummary(selectedLanguage, selectedTone);
    }, [url, selectedLanguage, selectedTone]);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLanguage(e.target.value);
        setLoading(true);
    };

    const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTone(e.target.value);
        setLoading(true);
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
                <div className="flex flex-col gap-6 p-4 rounded-lg shadow w-[70%] h-[70%]">
                    <div className="flex justify-between">
                        <p className="text-3xl font-mono">Summary</p>
                        <div className="flex gap-4">
                            <Dropdown />
                            {/* <select
                                onChange={handleLanguageChange}
                                className="mb-4 p-2 rounded border bg-gray-900/70 border-none"
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select> */}

                            <Dropdown />

                            {/* <select
                                onChange={handleToneChange}
                                className="mb-4 p-2 rounded border bg-gray-900/70 border-none"
                            >
                                {tones.map((tone) => (
                                    <option key={tone.value} value={tone.value}>
                                        {tone.label}
                                    </option>
                                ))}
                            </select> */}
                        </div>
                    </div>
                    {error ? (
                        <p className="text-red-500">{error}</p>
                    ) : (
                        <div className="bg-gray-900/70  p-4 rounded-lg">{summary}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SummaryPage;
