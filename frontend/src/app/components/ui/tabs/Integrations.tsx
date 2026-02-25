"use client"

import React, { useEffect, useState } from "react"
import api from "@/app/api"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Cloud, FileText, Loader2, MessageCircle, Send, Unplug, Blocks } from "lucide-react"
import clsx from "clsx"
import Cookies from 'js-cookie' // Make sure this is imported
const INTEGRATIONS = [
    {
        id: "notion",
        name: "Notion",
        description: "Read and write to your Notion workspaces.",
        icon: FileText,
        color: "text-slate-800 dark:text-white"
    },
    {
        id: "google_drive",
        name: "Google Drive",
        description: "Access and analyze Docs, Sheets, and Slides.",
        icon: Cloud,
        color: "text-blue-500 dark:text-blue-400"
    },
    {
        id: "discord",
        name: "Discord",
        description: "Read server history and interact via bots.",
        icon: MessageCircle,
        color: "text-indigo-500 dark:text-indigo-400"
    },
    {
        id: "slack",
        name: "Slack",
        description: "Connect to Slack bots and groups.",
        icon: Send,
        color: "text-sky-500 dark:text-sky-400"
    }
]

export default function Integrations() {
    const [connectedApps, setConnectedApps] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [connectingTo, setConnectingTo] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()

    // 1. Fetch tokens and check for successful OAuth redirect
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

        // If the URL has ?success=true (from your FastAPI redirect), clear the params
        if (searchParams.get('success') === 'true') {
            router.replace('/settings?tab=integrations') // or wherever this modal lives
        }
    }, [searchParams])

    // 2. REAL OAUTH CONNECT: Redirects browser to backend
    const handleConnect = (appId: string) => {
        setConnectingTo(appId)

        // Construct backend OAuth trigger URL
        // Replace with your actual backend production URL if needed
        const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const token = Cookies.get('access_token')
        // This initiates the "Notion Login" dance
        window.location.href = `${backendBaseUrl}/${appId}/login?token=${token}`
    }

    // 3. Handle Disconnect
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
        <div className="space-y-10 font-mono">
            {/* SECTION 1: CONNECTED APPS */}
            <div>
                <div className="mb-4">
                    <h3 className="text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                        Your Connected Apps
                    </h3>
                    <p className="text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                        Manage your active integrations and data access.
                    </p>
                </div>

                {connectedList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed transition-colors
                        bg-slate-50 border-slate-300
                        dark:bg-white/5 dark:border-secondary"
                    >
                        <Blocks size={32} className="mb-3 text-slate-400 dark:text-slate-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No apps connected yet.</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect an app below to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {connectedList.map((app) => {
                            const Icon = app.icon
                            return (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-4 rounded-xl border transition-colors gap-4
                                        bg-white border-slate-200 shadow-sm
                                        dark:bg-white/5 dark:border-secondary dark:shadow-none"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="p-3 rounded-xl transition-colors bg-slate-50 dark:bg-white/10 shrink-0">
                                            <Icon size={24} className={app.color} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-lg text-slate-900 dark:text-slate-200 truncate">
                                                    {app.name}
                                                </h4>
                                                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 shrink-0">
                                                    <CheckCircle2 size={12} />
                                                    Connected
                                                </span>
                                            </div>
                                            <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                                                {app.description}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDisconnect(app.id)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shrink-0
                                            bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600
                                            dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                    >
                                        <Unplug size={16} />
                                        Disconnect
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: AVAILABLE APPS */}
            <div>
                <div className="mb-4 border-t pt-8 transition-colors border-slate-200 dark:border-secondary">
                    <h3 className="text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                        Available to Connect
                    </h3>
                    <p className="text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                        Link your accounts to allow the AI to read your private data securely via MCP.
                    </p>
                </div>

                {availableList.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border transition-colors
                        bg-slate-50 border-slate-200 text-slate-600
                        dark:bg-white/5 dark:border-secondary dark:text-slate-400"
                    >
                        You have connected all available applications!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {availableList.map((app) => {
                            const isConnecting = connectingTo === app.id
                            const Icon = app.icon

                            return (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-4 rounded-xl border transition-colors
                                        bg-white border-slate-200 shadow-sm
                                        dark:bg-white/5 dark:border-secondary dark:shadow-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl transition-colors bg-slate-100 dark:bg-[#0b0b0b]">
                                            <Icon size={24} className={app.color} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-200">
                                                {app.name}
                                            </h4>
                                            <p className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
                                                {app.description}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleConnect(app.id)}
                                        disabled={isConnecting}
                                        className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-70
                                            bg-slate-900 text-white hover:bg-slate-800 shadow-sm
                                            dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90 dark:shadow-none"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            "Connect"
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