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

export default api