"use client";
import React, { use, useEffect, useState } from 'react'
import Cookies from 'js-cookie';
import axios from 'axios';
import { SummaryHistoryResponse } from '../types';
import Navbar from '../components/Navbar';
const page = () => {

    const [summaries, setSummaries] = useState<SummaryHistoryResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const fetchUserSummaries = async () => {
        try {
            const token = Cookies.get("access_token");
            const response = await axios.get(`http://localhost:8000/user_summaries/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
            });
            console.log(response)
            setSummaries(response.data.summaries)
        } catch (error) {
            console.error("Error fetching user summaries:", error);
            return [];
        }
        finally {
            setLoading(false)
        }
    };

    const previewFile = async (file_url: string) => {
        if (file_url) {
            try {
                const response = await fetch(`http://localhost:8000/${file_url}`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error(`File not found with id ${file_url}`);
                }

                const fileBlob = await response.blob();
                const fileUrl = URL.createObjectURL(fileBlob);

                return fileUrl;
            } catch (error) {
                console.error('Error fetching file:', error);
                throw error;
            }
        };
        return ""
    }

    useEffect(() => {
        fetchUserSummaries();
    }, [])

    return (
        <div>

            <Navbar />
        </div>
    )
}

export default page