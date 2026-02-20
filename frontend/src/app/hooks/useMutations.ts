import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Cookies from 'js-cookie';

export const useMutations = () => {
    const token = Cookies.get("access_token");

    interface QueryPayload {
        query: string;
        id: string;
        files: File[]
        modal: string
    }

    interface QueryResponse {
        res: string; // matches your result.res
        sources?: any[];
        id?: string;
    }

    const sendQuery = useMutation({
        mutationFn: async ({ query, id, files, modal }: QueryPayload) => {
            const form = new FormData();

            form.append("query", query);
            form.append("id", id);
            form.append("modal_name", modal)

            files.forEach((file: File) => {
                form.append("files", file);
            });

            const { data } = await axios.post(
                "http://localhost:8000/query",
                form,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    withCredentials: true,
                }
            );

            return data;
        },
        onError: (error) => {
            console.error(error);
        },
    });
    return { sendQuery }
}