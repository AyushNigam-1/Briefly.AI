"use client";

import axios from "axios";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";

interface Summary {
    id: string;
    title: string;
    content: string;
}

const Page = () => {
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchFavoriteSummaries(): Promise<Summary[]> {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get<{ favorites: Summary[] }>(
                "http://localhost:8000/summary/favorites/",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    withCredentials: true,
                }
            );
            return response.data.favorites;
        } catch (error: any) {
            setError(error.response?.data?.detail || error.message);
            return [];
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFavoriteSummaries().then((data) => setSummaries(data));
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {summaries.length > 0 ? (
                summaries.map((summary) => (
                    <div key={summary.id} className="border p-4 rounded shadow">
                        <h2 className="text-lg font-bold">{summary.title}</h2>
                        <p className="text-sm text-gray-600">{summary.content}</p>
                    </div>
                ))
            ) : (
                <p>No favorite summaries found.</p>
            )}
        </div>
    );
};

export default Page;
