import { fetchEventSource } from "@microsoft/fetch-event-source"
import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios"
import { authClient } from "./auth-client"

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

class StopRetryError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "StopRetryError"
    }
}

const api: AxiosInstance = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
})

// Attach Bearer token on every outgoing request
api.interceptors.request.use(async (config) => {
    const { data } = await authClient.getSession()
    const token = data?.session?.token
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
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

type StreamCallbacks = {
    endpoint: string
    body: BodyInit
    abortController: AbortController
    onToken: (t: string) => void
    onThinking: (t: string) => void
    onDone: (sources?: any, id?: string, title?: string) => void
    onBlocked?: () => void
    isPrivate?: boolean
}

export async function streamChat({
    endpoint,
    body,
    abortController,
    onToken,
    onThinking,
    onAnalyzing,
    onDone,
    onBlocked,
}: StreamCallbacks & { onAnalyzing?: (text: string) => void }) {

    const { data } = await authClient.getSession()
    const token = data?.session?.token

    const headers: Record<string, string> = {}
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    if (typeof body === "string") {
        headers["Content-Type"] = "application/json"
    }

    await fetchEventSource(`${baseURL}${endpoint}`, {
        method: "POST",
        headers: headers,
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

            if (parsed.type === "token") {
                onToken(parsed.data)
            }

            if (parsed.type === "thinking") {
                onThinking(parsed.data)
            }

            if (parsed.type === "analyzing") {
                if (onAnalyzing) {
                    onAnalyzing(parsed.data)
                } else {
                    onThinking(parsed.data)
                }
            }

            if (parsed.type === "done") {
                onDone(parsed.sources, parsed.id, parsed.title)
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