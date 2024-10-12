"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MarkdownIt from "markdown-it";
import "tailwindcss/tailwind.css";
const md = new MarkdownIt();
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
                setSummary(data.summary);
            } catch (err: any) {
                setError(err.message || "An unknown error occurred.");
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [url]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h1>Summary for: {url}</h1>
            <div
                className="markdown-container"
                dangerouslySetInnerHTML={{ __html: md.render(summary) }}
            />
        </div>
    );
};

export default SummaryPage;
