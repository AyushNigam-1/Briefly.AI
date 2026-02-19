"use client"

import React, { Fragment, useEffect, useState } from "react"
import axios from "axios"
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Transition,
    TransitionChild,
} from "@headlessui/react"
import { Trash2, Play, X, Workflow, Search, Dot } from "lucide-react"
import api from "@/app/api"
import clsx from "clsx"

interface Workflow {
    workflow_id: string
    workflow_name: string
    is_active: boolean
    created_at?: string
}

interface Props {
    open: boolean
    onClose: () => void
}

export default function TaskManagerModal() {
    const [open, setOpen] = useState(false)
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState("")

    const load = async () => {
        setLoading(true)
        const res = await api.get("/workflows")
        console.log(res)
        setWorkflows(res.data.data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (open) load()
    }, [open])

    const runWorkflow = async (id: string) => {
        await api.post("/workflows/execute", { workflow_id: id })
    }

    const deleteWorkflow = async (id: string) => {
        await api.delete(`/workflows/${id}`)
        setWorkflows(prev => prev.filter(w => w.workflow_id !== id))
    }
    const filtered = workflows.filter(w =>
        w.workflow_name.toLowerCase().includes(query.toLowerCase())
    )
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="p-3 flex items-center w-full hover:bg-white/10 justify-center gap-2 font-bold bg-white/5 border border-secondary rounded-xl text-primary font-mono"
            >
                <Workflow size={18} />
                Manage Tasks
            </button>

            <Transition appear show={open} as={Fragment}>
                <Dialog onClose={() => setOpen(false)} className="relative z-50">

                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </TransitionChild>

                    <div className="fixed inset-0 flex items-center justify-center">

                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full space-y-3 h-[60vh] max-w-xl bg-[#0b0b0b] text-primary border border-secondary rounded-xl p-5">

                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold"> Tasks</h2>
                                    <button onClick={() => setOpen(false)}>
                                        <X size={20} className="text-gray-400 hover:text-white" />
                                    </button>
                                </div>
                                <hr className="border border-secondary" />
                                <div className="relative mb-4">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    />
                                    <input
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search workflows..."
                                        className="w-full pl-8 pr-4 py-2 bg-white/5 border border-secondary rounded-lg outline-none text-slate-200"
                                    />

                                </div>
                                {/* List */}
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">

                                    {loading && (
                                        <p className="text-slate-500 text-s text-center">Loading…</p>
                                    )}

                                    {!loading && filtered.length === 0 && (
                                        <p className="text-slate-500 text-sm text-center">
                                            No workflows found.
                                        </p>
                                    )}

                                    {filtered?.map(w => (
                                        <div
                                            key={w.workflow_id}
                                            className="flex items-center justify-between bg-white/5 border border-secondary rounded-lg px-3 py-2"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-slate-200 text-xl font-semibold">
                                                    {w.workflow_name}
                                                </p>
                                                <div className="flex gap-2 items-center">

                                                    <span
                                                        className={clsx(
                                                            "text-sm rounded-full flex items-center font-medium",
                                                            w.is_active
                                                                ? "text-green-400"
                                                                : "text-slate-400"
                                                        )}
                                                    >
                                                        <Dot size={20} /> {w.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                    <p className="text-sm text-slate-400 flex items-center">
                                                        <Dot size={18} />{new Date(w.created_at!).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => runWorkflow(w.workflow_id)}
                                                    className="p-3 rounded-md bg-white/5 hover:bg-white/10"
                                                    title="Run"
                                                >
                                                    <Play size={20} />
                                                </button>

                                                <button
                                                    onClick={() => deleteWorkflow(w.workflow_id)}
                                                    className="p-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                </div>

                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}
