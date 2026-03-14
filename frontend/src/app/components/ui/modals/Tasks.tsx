"use client"

import React, { useEffect, useState } from "react"
import api from "@/app/lib/api"
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react"
import { Trash2, Play, X, Workflow, Search, Loader2, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"
import { SearchModalProps, Task } from "@/app/types"

export default function TaskManagerModal({ onCloseSidebar }: SearchModalProps) {
    const [open, setOpen] = useState(false)
    const [workflows, setWorkflows] = useState<Task[]>([])
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

    // 🌟 Sleek Date Formatter
    const formatDate = (dateString?: string) => {
        if (!dateString) return ""
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filtered = workflows.filter(w =>
        w.workflow_name.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <>
            <button
                onClick={() => { setOpen(true); onCloseSidebar() }}
                className="p-3 flex items-center w-full justify-center gap-2 font-bold rounded-xl transition-colors
                    bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100
                    dark:bg-white/5 dark:text-primary dark:border-secondary dark:hover:bg-white/10"
            >
                <Workflow size={18} />
                Manage Tasks
            </button>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                className="relative z-50"
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                        bg-black/40 dark:bg-black/60"
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="w-full max-w-2xl h-[60vh] min-h-[450px] flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:-translate-y-4
                            bg-white border-slate-200 font-sans
                            dark:bg-[#0f0f0f] dark:border-white/10"
                    >
                        {/* 🌟 Command Palette Style Header */}
                        <div className="relative flex shrink-0 items-center p-4 border-b border-slate-200 dark:border-white/10 z-20">
                            <Search className="absolute left-5 text-slate-400 dark:text-gray-500" size={20} strokeWidth={2} />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="w-full bg-transparent pl-10 pr-10 text-lg sm:text-xl font-medium outline-none text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600"
                            />
                            <button
                                onClick={() => setOpen(false)}
                                className="absolute right-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* 🌟 Results Body with AnimatePresence */}
                        <div className="flex-1 relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-gray-500"
                                    >
                                        <Loader2 size={28} className="animate-spin opacity-60" />
                                    </motion.div>
                                ) : filtered.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-gray-500 gap-3 text-center"
                                    >
                                        <Workflow size={32} className="opacity-30 mb-2" />
                                        <p className="text-sm">No tasks or workflows found.</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="results"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="absolute inset-0 overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10"
                                    >
                                        {filtered.map(w => (
                                            <div
                                                key={w.workflow_id}
                                                className="mb-3 bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm group"
                                            >
                                                <div className="flex items-center justify-between p-4">
                                                    <div className="space-y-1.5 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                {w.workflow_name}
                                                            </p>
                                                            <span className={clsx(
                                                                "h-2 w-2 rounded-full",
                                                                w.is_active ? "bg-green-500" : "bg-slate-400"
                                                            )} />
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 dark:text-gray-500 uppercase tracking-tight">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={12} />
                                                                {formatDate(w.created_at)}
                                                            </span>
                                                            <span>•</span>
                                                            <span className={w.is_active ? "text-green-600 dark:text-green-400" : ""}>
                                                                {w.is_active ? "Active" : "Disabled"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => runWorkflow(w.workflow_id)}
                                                            className="p-2 rounded-lg transition-colors border border-transparent
                                                                bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200
                                                                dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/10"
                                                            title="Run Task"
                                                        >
                                                            <Play size={16} fill="currentColor" />
                                                        </button>

                                                        <button
                                                            onClick={() => deleteWorkflow(w.workflow_id)}
                                                            className="p-2 rounded-lg transition-colors border border-transparent
                                                                bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-200
                                                                dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300 dark:hover:border-red-500/20"
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}