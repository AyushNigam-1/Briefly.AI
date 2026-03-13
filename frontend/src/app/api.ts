import { fetchEventSource } from "@microsoft/fetch-event-source"
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig
} from "axios"

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean
}
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

let isRefreshing = false

let failedQueue: {
    resolve: () => void
    reject: (error: any) => void
    config: RetryAxiosRequestConfig
}[] = []

const processQueue = (error: any) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else resolve()
    })

    failedQueue = []
}

api.interceptors.response.use(
    (response: AxiosResponse) => response,

    async (error: AxiosError) => {
        const originalRequest = error.config as RetryAxiosRequestConfig

        if (!originalRequest) return Promise.reject(error)

        if (error.response?.status === 401 && !originalRequest._retry) {

            originalRequest._retry = true

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: () => resolve(api(originalRequest)),
                        reject,
                        config: originalRequest,
                    })
                })
            }

            isRefreshing = true

            try {
                await api.post("/refresh")

                processQueue(null)

                return api(originalRequest)

            } catch (err) {
                processQueue(err)
                window.location.href = "/account/login"
                return Promise.reject(err)

            } finally {
                isRefreshing = false
            }
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
    isPrivate
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    const startStream = async () => {
        await fetchEventSource(`${API_URL}${endpoint}`, {
            method: "POST",
            credentials: "include",
            headers: isPrivate ? {} : { "Content-Type": "application/json" },
            body,
            signal: abortController.signal,

            async onopen(res) {
                if (res.status === 401) throw new Error("SESSION_EXPIRED")
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
                if (err instanceof StopRetryError || err.name === "AbortError") throw err
                throw err
            }
        })
    }

    try {
        await startStream()
    } catch (err: any) {

        if (err.message === "SESSION_EXPIRED") {
            await api.post("/refresh")
            await startStream()
            return
        }

        throw err
    }
}

export default api