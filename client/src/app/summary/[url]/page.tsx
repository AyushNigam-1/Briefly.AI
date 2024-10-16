"use client";
import { AnimatePresence, motion } from "framer-motion";
import { div } from "framer-motion/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
];

const SummaryPage = () => {
    const params = useParams();
    const url = params?.url as string;
    const [summary, setSummary] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async (lang?: string | 'en' | null) => {
        try {
            const response = await fetch(
                `http://localhost:8000/summarize/?url=${url}&lang=${lang}`
            );
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(data.summary);
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
        fetchSummary();
    }, [url]);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const languageCode = e.target.value;
        fetchSummary(languageCode)
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
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="bg-gray-800 p-4 rounded-lg shadow w-[70%] h-[70%]">
                            <select
                                onChange={handleLanguageChange}
                                className="mb-4 p-2 rounded border"
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                            {error ? (
                                <p className="text-red-500">{error}</p>
                            ) : (
                                <div>{summary}</div>

                                // <div
                                //     dangerouslySetInnerHTML={{ __html: summary }}
                                //     className="text-white"
                                // />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

export default SummaryPage;
