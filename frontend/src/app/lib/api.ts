import { fetchEventSource } from "@microsoft/fetch-event-source"
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
} from "axios"

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

class StopRetryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StopRetryError";
    }
}

const api: AxiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            window.location.href = "/account/login"
        }
        return Promise.reject(error)
    }
)

export async function streamChat({
    endpoint,
    body,
    abortController,
    onToken,
    onThinking,
    onDone,
    onBlocked,
}: {
    endpoint: string
    body: BodyInit
    abortController: AbortController
    onToken: (t: string) => void
    onThinking: (t: string) => void
    onDone: (sources?: any, id?: string) => void
    onBlocked?: () => void
    isPrivate?: boolean
}) {

    await fetchEventSource(`${baseURL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {},
        body,
        signal: abortController.signal,

        async onopen(res) {
            if (res.status === 401) {
                window.location.href = "/account/login"
                throw new StopRetryError("Unauthorized")
            }
            if (!res.ok) throw new StopRetryError(`Failed: ${res.status}`)
        },

        onmessage(msg) {
            const parsed = JSON.parse(msg.data)

            if (parsed.type === "token") onToken(parsed.data)
            if (parsed.type === "thinking") onThinking(parsed.data)

            if (parsed.type === "done") {
                onDone(parsed.sources, parsed.id)
                abortController.abort()
            }

            if (parsed.type === "blocked") {
                onBlocked?.()
                abortController.abort()
            }
        },

        onclose() {
            throw new StopRetryError("Closed")
        },

        onerror(err) {
            throw err
        }
    })
}

export default api