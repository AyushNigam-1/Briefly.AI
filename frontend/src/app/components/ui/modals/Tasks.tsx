"use client"

import React, { useEffect, useState } from "react"
import api from "@/app/api"
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react"
import { Trash2, Play, X, Workflow, Search, Dot } from "lucide-react"
import clsx from "clsx"

interface Workflow {
    workflow_id: string
    workflow_name: string
    is_active: boolean
    created_at?: string
}

export default function TaskManagerModal() {
    const [open, setOpen] = useState(false)
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState("")

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get("/workflows")
            setWorkflows(res.data.data || [])
        } catch (error) {
            console.error("Failed to load workflows", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) load()
    }, [open])

    const runWorkflow = async (id: string) => {
        try {
            await api.post("/workflows/execute", { workflow_id: id })
        } catch (error) {
            console.error("Failed to execute workflow", error)
        }
    }

    const deleteWorkflow = async (id: string) => {
        try {
            await api.delete(`/workflows/${id}`)
            setWorkflows(prev => prev.filter(w => w.workflow_id !== id))
        } catch (error) {
            console.error("Failed to delete workflow", error)
        }
    }

    const filtered = workflows.filter(w =>
        w.workflow_name.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <>
            {/* The Trigger Button - Already perfectly dual-themed! */}
            <button
                onClick={() => setOpen(true)}
                className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                    bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100
                    dark:bg-white/5 dark:text-primary dark:border-secondary dark:hover:bg-white/10"
            >
                <Workflow size={18} />
                Manage Tasks
            </button>

            {/* Smooth Animated Dialog */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                className="relative z-50 font-mono"
            >
                {/* Animated Backdrop */}
                <DialogBackdrop
                    transition
                    className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                        bg-black/30 dark:bg-black/60"
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    {/* Animated Panel */}
                    <DialogPanel
                        transition
                        className="w-full max-w-xl h-[60vh] flex flex-col rounded-2xl border p-5 shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                            bg-white border-slate-200 shadow-slate-200/50
                            dark:bg-[#0b0b0b] dark:border-secondary dark:shadow-black/50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                Tasks
                            </DialogTitle>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded-md transition-colors
                                    text-slate-500 hover:text-slate-900 hover:bg-slate-100
                                    dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <hr className="border transition-colors border-slate-200 dark:border-secondary mb-4" />

                        {/* Search Bar */}
                        <div className="relative mb-4 shrink-0">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors
                                    text-slate-400 dark:text-slate-500"
                            />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search workflows..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none transition-colors border
                                    bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-300
                                    dark:bg-white/5 dark:border-secondary dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-white/20"
                            />
                        </div>

                        {/* Workflow List */}
                        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                            {loading && (
                                <div className="flex justify-center items-center h-full">
                                    <p className="text-sm font-medium animate-pulse text-slate-500 dark:text-slate-400">
                                        Loading workflows…
                                    </p>
                                </div>
                            )}

                            {!loading && filtered.length === 0 && (
                                <div className="flex justify-center items-center h-full">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        No workflows found.
                                    </p>
                                </div>
                            )}

                            {filtered?.map(w => (
                                <div
                                    key={w.workflow_id}
                                    className="flex items-center justify-between rounded-xl px-4 py-3 border transition-colors
                                        bg-white border-slate-200 hover:bg-slate-50
                                        dark:bg-white/5 dark:border-secondary dark:hover:bg-white/10"
                                >
                                    <div className="space-y-1">
                                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                            {w.workflow_name}
                                        </p>
                                        <div className="flex gap-1 items-center">
                                            <span
                                                className={clsx(
                                                    "text-sm rounded-full flex items-center font-semibold",
                                                    w.is_active
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-slate-500 dark:text-slate-400"
                                                )}
                                            >
                                                <Dot size={24} className="-ml-2" />
                                                <span className="-ml-1">{w.is_active ? "Active" : "Inactive"}</span>
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                                                {new Date(w.created_at!).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => runWorkflow(w.workflow_id)}
                                            className="p-2.5 rounded-lg transition-colors
                                                bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900
                                                dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                                            title="Run Workflow"
                                        >
                                            <Play size={18} fill="currentColor" />
                                        </button>

                                        <button
                                            onClick={() => deleteWorkflow(w.workflow_id)}
                                            className="p-2.5 rounded-lg transition-colors
                                                bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700
                                                dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                            title="Delete Workflow"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}