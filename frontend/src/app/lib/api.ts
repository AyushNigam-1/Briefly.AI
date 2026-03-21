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

// Token queue drip system
const TOKEN_DRIP_INTERVAL = 80  // ms between renders — tune this (20-40 is sweet spot)
const TOKENS_PER_TICK = 2     // how many chars to release per tick

type StreamCallbacks = {
    endpoint: string
    body: BodyInit
    abortController: AbortController
    onToken: (t: string) => void
    onThinking: (t: string) => void
    onDone: (sources?: any, id?: string) => void
    onBlocked?: () => void
    isPrivate?: boolean
}

export async function streamChat({
    endpoint,
    body,
    abortController,
    onToken,
    onThinking,
    onDone,
    onBlocked,
}: StreamCallbacks) {

    const tokenQueue: string[] = []
    let dripInterval: ReturnType<typeof setInterval> | null = null
    let streamDone = false
    let donePayload: { sources?: any; id?: string } | null = null

    const startDrip = () => {
        if (dripInterval) return

        dripInterval = setInterval(() => {
            if (tokenQueue.length > 0) {
                // Release a small chunk per tick
                const chunk = tokenQueue.splice(0, TOKENS_PER_TICK).join("")
                onToken(chunk)
            } else if (streamDone) {
                // Queue empty + stream finished = we're done
                clearInterval(dripInterval!)
                dripInterval = null
                if (donePayload) {
                    onDone(donePayload.sources, donePayload.id)
                }
            }
        }, TOKEN_DRIP_INTERVAL)
    }

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

            if (parsed.type === "token") {
                tokenQueue.push(parsed.data)
                startDrip()
            }

            if (parsed.type === "thinking") {
                onThinking(parsed.data)
            }

            if (parsed.type === "done") {
                streamDone = true
                donePayload = { sources: parsed.sources, id: parsed.id }
                abortController.abort()
            }

            if (parsed.type === "blocked") {
                onBlocked?.()
                abortController.abort()
            }
        },

        onclose() {
            streamDone = true
            throw new StopRetryError("Closed")
        },

        onerror(err) {
            if (dripInterval) {
                clearInterval(dripInterval)
                dripInterval = null
            }
            throw err
        }
    })
}

export default api