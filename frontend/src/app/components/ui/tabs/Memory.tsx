"use client"

import api from "@/app/lib/api"
import { Switch } from "@headlessui/react"
import clsx from "clsx"
import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react"

interface MemoryItem {
    id: string
    text: string
    created_at?: string
}

const Memory: React.FC = () => {
    const [memories, setMemories] = useState<MemoryItem[]>([])
    const [newMemory, setNewMemory] = useState("")
    const [memoryEnabled, setMemoryEnabled] = useState(false)

    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

    useEffect(() => {
        api.get("/memory").then(res => {
            setMemories(res.data.memories || [])
            setMemoryEnabled(Boolean(res.data.enabled))
        })
    }, [])

    const toggleMemory = async (val: boolean) => {
        setMemoryEnabled(val)
        await api.post("/memory/toggle", { enabled: val })
    }

    const handleUpdateMemory = async (id: string, text: string) => {
        await api.put("/memory", {
            memory_id: id,
            text,
        })

        setMemories(prev =>
            prev.map(m => (m.id === id ? { ...m, text } : m))
        )
    }

    const handleDeleteMemory = async (id: string) => {
        const res = await api.delete(`/memory/${id}`)
        setMemories(res.data.memories)
    }

    useLayoutEffect(() => {
        memories.forEach(m => {
            const el = textareaRefs.current[m.id]
            if (!el) return
            el.style.height = "auto"
            el.style.height = el.scrollHeight - 2 + "px"
        })
    }, [memories])

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="border-b border-slate-200 dark:border-white/10 pb-4 sm:pb-5">
                <h3 className="text-lg sm:text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                    Saved Memories
                </h3>
                <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                    Long-term facts the assistant can use during conversations.
                </p>
            </div>

            {/* TOGGLE */}
            <div className="flex items-center justify-between bg-white/5 border border-secondary rounded-xl px-4 py-3">
                <div>
                    <p className="text-slate-200 font-semibold">
                        Use memories in conversations
                    </p>
                    <p className="text-xs text-slate-400">
                        Turn off to temporarily disable personalization.
                    </p>
                </div>

                <Switch
                    checked={memoryEnabled}
                    onChange={toggleMemory}
                    className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition",
                        memoryEnabled ? "bg-white/20" : "bg-white/5"
                    )}
                >
                    <span
                        className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition",
                            memoryEnabled ? "translate-x-6" : "translate-x-1"
                        )}
                    />
                </Switch>
            </div>

            {/* MEMORY LIST */}
            <div className="space-y-3 overflow-y-auto custom-scrollbar">

                {memories.map(m => (
                    <div
                        key={m.id}
                        className="bg-white/5 border border-secondary rounded-xl px-3 py-2"
                    >
                        <textarea
                            // ref={el => (textareaRefs.current[m.id] = el)}
                            rows={1}
                            value={m.text}
                            onChange={e =>
                                setMemories(prev =>
                                    prev.map(x =>
                                        x.id === m.id
                                            ? { ...x, text: e.target.value }
                                            : x
                                    )
                                )
                            }
                            onBlur={() => handleUpdateMemory(m.id, m.text)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleUpdateMemory(m.id, m.text)
                                }
                            }}
                            className="w-full bg-transparent outline-none resize-none overflow-hidden text-slate-200 leading-snug p-0 block"
                        />

                        <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="mt-2 text-xs text-red-400 hover:text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                ))}

            </div>

        </div>
    )
}

export default Memory
