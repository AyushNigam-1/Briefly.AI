import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export const useMutations = () => {
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
                payload
            );
            return data;
        },
        onError: (error) => {
            console.error(error);
        },
    });
    return { sendQuery }
}