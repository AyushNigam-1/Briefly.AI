"use client"

import { useEffect, useState } from "react"
import api from "@/app/lib/api"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Blocks, Unplug, Plug } from "lucide-react"
import { RiNotionFill } from "react-icons/ri";
import { FaGoogleDrive } from "react-icons/fa";
import { FaSlack } from "react-icons/fa";
import { CgLinear } from "react-icons/cg";
import Cookies from 'js-cookie'

const INTEGRATIONS = [
    {
        id: "notion",
        name: "Notion",
        company: "Notion Labs, Inc.",
        icon: RiNotionFill,
    },
    {
        id: "google",
        name: "Google Drive",
        company: "Google LLC",
        icon: FaGoogleDrive,
    },
    {
        id: "linear",
        name: "Linear",
        company: "Linear Orbit, Inc.",
        icon: CgLinear,
    },
    {
        id: "slack",
        name: "Slack",
        company: "Salesforce, Inc.",
        icon: FaSlack,
    }
]

export default function Integrations() {
    const [connectedApps, setConnectedApps] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [connectingTo, setConnectingTo] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()

    const fetchTokens = async () => {
        try {
            const res = await api.get("/tokens")
            setConnectedApps(res.data.app_tokens || {})
        } catch (error) {
            console.error("Failed to fetch integration tokens", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTokens()
        if (searchParams.get('success') === 'true') {
            router.replace('/settings?tab=integrations')
        }
    }, [searchParams])

    const handleConnect = (appId: string) => {
        setConnectingTo(appId)
        const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const token = Cookies.get('access_token')
        window.location.href = `${backendBaseUrl}/${appId}/login?token=${token}`
    }

    const handleDisconnect = async (appId: string) => {
        try {
            await api.post("/tokens", {
                app_name: appId,
                token: ""
            })
            setConnectedApps(prev => {
                const updated = { ...prev }
                delete updated[appId]
                return updated
            })
        } catch (error) {
            console.error(`Failed to disconnect ${appId}`, error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
        )
    }

    const connectedList = INTEGRATIONS.filter(app => !!connectedApps[app.id])
    const availableList = INTEGRATIONS.filter(app => !connectedApps[app.id])

    return (
        <div className="space-y-8 sm:space-y-10 font-mono">
            <div>
                <div className="mb-4">
                    <h3 className="text-lg sm:text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                        Your Connected Apps
                    </h3>
                    <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                        Manage your active integrations and data access.
                    </p>
                </div>

                {connectedList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-xl border border-dashed transition-colors
                        bg-slate-50 border-slate-300
                        dark:bg-white/5 dark:border-secondary"
                    >
                        <Blocks size={32} className="mb-3 text-slate-400 dark:text-slate-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm sm:text-base">No apps connected yet.</p>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Connect an app below to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {connectedList.map((app) => {
                            const Icon = app.icon
                            return (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-colors gap-2 sm:gap-4
                                        bg-white border-slate-200 shadow-sm
                                        dark:bg-white/5 dark:border-secondary dark:shadow-none"
                                >
                                    {/* 🌟 FIX: Unified flex layout with min-w-0 to prevent text from pushing buttons off screen */}
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="p-2 sm:p-3 rounded-xl transition-colors bg-slate-50 dark:bg-white/10 shrink-0">
                                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-200 truncate">
                                                {app.name}
                                            </h4>
                                            <p className="text-xs sm:text-sm mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                                                {app.company}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 🌟 FIX: Responsive Button (Icon-only on mobile, full text on desktop) */}
                                    <button
                                        onClick={() => handleDisconnect(app.id)}
                                        title="Disconnect"
                                        className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-sm font-semibold rounded-lg transition-colors shrink-0
                                            bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600
                                            dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                    >
                                        <Unplug size={16} className="shrink-0" />
                                        <span className="hidden sm:inline">Disconnect</span>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: AVAILABLE APPS */}
            <div>
                <div className="mb-4 border-t pt-6 sm:pt-8 transition-colors border-slate-200 dark:border-secondary">
                    <h3 className="text-lg sm:text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                        Available to Connect
                    </h3>
                    <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                        Link your accounts to allow the AI to read your private data securely via MCP.
                    </p>
                </div>

                {availableList.length === 0 ? (
                    <div className="p-4 sm:p-6 text-center text-sm sm:text-base rounded-xl border transition-colors
                        bg-slate-50 border-slate-200 text-slate-600
                        dark:bg-white/5 dark:border-secondary dark:text-slate-400"
                    >
                        You have connected all available applications!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {availableList.map((app) => {
                            const isConnecting = connectingTo === app.id
                            const Icon = app.icon

                            return (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl border gap-2 sm:gap-4
                                        bg-white border-slate-200 shadow-sm
                                        dark:bg-white/5 dark:border-secondary dark:shadow-none"
                                >
                                    {/* 🌟 FIX: Applied the exact same structure as the Connected section for perfect alignment */}
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="p-2 sm:p-3 rounded-xl bg-slate-100 dark:bg-[#0b0b0b] shrink-0">
                                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-200 truncate">
                                                {app.name}
                                            </h4>
                                            <p className="text-xs sm:text-sm mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                                                {app.company}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleConnect(app.id)}
                                        disabled={isConnecting}
                                        title="Connect"
                                        className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-sm font-bold rounded-lg shrink-0
                                            bg-slate-900 text-white hover:bg-slate-800
                                            dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin shrink-0" />
                                                <span className="hidden sm:inline">Connecting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plug size={16} className="shrink-0" />
                                                <span className="hidden sm:inline">Connect</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}