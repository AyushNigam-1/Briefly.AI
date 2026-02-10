import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Cookies from 'js-cookie';

export const useMutations = () => {
    const token = Cookies.get("access_token");

    interface QueryPayload {
        query: string;
        id: string;
    }

    interface QueryResponse {
        res: string; // matches your result.res
        sources?: any[];
        id?: string;
    }

    const sendQuery = useMutation({
        mutationFn: async (payload: QueryPayload) => {
            const { data } = await axios.post<QueryResponse>(
                "http://localhost:8000/query",
                payload,
                {
                    // 2. THIS IS THE MISSING PART
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    withCredentials: true,
                },
            );
            return data;
        },
        onError: (error) => {
            console.error(error);
        },
    });
    return { sendQuery }
}