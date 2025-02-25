"use client"
import axios from 'axios';
import Cookies from 'js-cookie'
import { useEffect } from 'react';
const page = () => {
    async function fetchFavoriteSummaries() {
        try {
            const token = Cookies.get("access_token");

            const response = await axios.get('http://localhost:8000/summary/favorites/', {
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                withCredentials: true,
            });
            console.log(response)
            return response.data.favorites;
        } catch (error: any) {
            console.error('Error:', error.response?.data?.detail || error.message);
            return [];
        }
    }
    useEffect(() => {
        fetchFavoriteSummaries().then((data) => {
            console.log(data);
        });
    }, []);
    return (
        <div></div>
    )
}

export default page