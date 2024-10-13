"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import "tailwindcss/tailwind.css";
const SummaryPage = () => {
    const params = useParams();
    const url = params?.url as string;
    const [summary, setSummary] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!url) {
            setError("URL parameter is missing.");
            setLoading(false);
            return;
        }
        const fetchSummary = async () => {
            try {
                const response = await fetch(
                    `http://localhost:8000/summarize/?url=${url}`
                );

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(data.summary)
                // const summary = await marked(data.summary)
                // console.log(summary)
                setSummary(data.summary);
            } catch (err: any) {
                setError(err.message || "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [url]);

    // if (loading) return <p>Loading...</p>;
    // if (error) return <p>Error: {error}</p>;

    return (
        <div className="gap-3 flex justify-center items-center h-[100vh] w-[100vw]" >
            {
                loading ? <img src="/loader.gif" /> : <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* <div className="bg-gray-800 p-4 rounded-lg shadow w-[70%] h-[70%]" > */}
                        <div
                            dangerouslySetInnerHTML={{ __html: summary }}
                            className="text-white"
                        />
                        {/* </div> */}
                    </motion.div>
                </AnimatePresence>
            }

        </div>
    );
};

export default SummaryPage;
