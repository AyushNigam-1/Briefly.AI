import axios from "axios"
import Cookies from "js-cookie"

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
    withCredentials: true,
})

// Automatically attach token on every request
api.interceptors.request.use((config) => {
    const token = Cookies.get("access_token")

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
