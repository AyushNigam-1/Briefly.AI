"use client"

import { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import api from "@/app/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type Verbosity = "Ultra Short" | "Concise" | "Balanced" | "Detailed" | "Very Detailed"
type Style =
    | "Technical"
    | "Casual"
    | "Professional"
    | "Storytelling"
    | "Educational"
    | "Minimal"

const verbosityOptions: Verbosity[] = [
    "Ultra Short",
    "Concise",
    "Balanced",
    "Detailed",
    "Very Detailed",
]

const styleOptions: Style[] = [
    "Technical",
    "Professional",
    "Casual",
    "Educational",
    "Minimal",
    "Storytelling",
]

export default function Preference() {
    const queryClient = useQueryClient()
    const [instruction, setInstruction] = useState("")
    const [verbosity, setVerbosity] = useState<Verbosity>("Balanced")
    const [style, setStyle] = useState<Style>("Technical")
    const [isInitialized, setIsInitialized] = useState(false)

    const debounce = useRef<NodeJS.Timeout | null>(null)

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['preferences'],
        queryFn: async () => {
            const res = await api.get("/preference/get")
            return res.data
        }
    })

    useEffect(() => {
        if (data && !isInitialized) {
            setInstruction(data.custom_instruction || "")
            setVerbosity(data.verbosity || "Balanced")
            setStyle(data.tone || "Technical")
            setIsInitialized(true)
        }
    }, [data, isInitialized])

    const isLoading = isQueryLoading || !isInitialized;

    const updateMutation = useMutation({
        mutationFn: async ({ field, value }: { field: string, value: string }) => {
            await api.post("/preference/update", { field, value })
        },
        onMutate: async ({ field, value }) => {
            await queryClient.cancelQueries({ queryKey: ['preferences'] })
            const previous = queryClient.getQueryData(['preferences'])
            queryClient.setQueryData(['preferences'], (old: any) => ({
                ...old,
                [field]: value
            }))
            toast.success("Preferences saved", { id: "pref-save", duration: 2000 })

            return { previous }
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['preferences'], context?.previous)
            toast.error("Failed to save preference", { id: "pref-save" })
        }
    })

    useEffect(() => {
        if (isLoading) return
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(() => {
            if (data && instruction !== (data.custom_instruction || "")) {
                updateMutation.mutate({ field: "custom_instruction", value: instruction })
            }
        }, 700)
    }, [instruction, isLoading, data, updateMutation])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault()
                if (debounce.current) clearTimeout(debounce.current)
                updateMutation.mutate({ field: "custom_instruction", value: instruction })
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [instruction, updateMutation])

    return (
        <div className="relative w-full font-mono">
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center h-[80vh] sm:h-[65vh] z-10"
                    >
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-500" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8 w-full"
                    >
                        <div>
                            <div className="mb-3 sm:mb-4">
                                <h3 className="text-lg sm:text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                                    Custom Instructions
                                </h3>
                                <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                                    Persistent behavior across all chats.
                                </p>
                            </div>
                            <textarea
                                value={instruction}
                                onChange={e => setInstruction(e.target.value)}
                                className="w-full h-40 rounded-xl p-4 custom-scrollbar text-sm outline-none resize-none transition-colors border
                                bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400
                                dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-white/30"
                                placeholder="I am a developer. Prefer concise answers. Show code examples."
                            />
                        </div>

                        <div>
                            <div className="mb-3">
                                <h4 className="text-lg font-bold transition-colors text-slate-900 dark:text-slate-200">
                                    Verbosity
                                </h4>
                                <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                                    Choose how long responses should be.
                                </p>
                            </div>

                            <div className="flex gap-2.5 flex-wrap">
                                {verbosityOptions.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => {
                                            setVerbosity(v)
                                            updateMutation.mutate({ field: "verbosity", value: v })
                                        }}
                                        className={clsx(
                                            "px-4 py-2 text-sm rounded-lg border transition-all duration-200 font-medium",
                                            verbosity === v
                                                ? "bg-slate-800 border-slate-800 text-white shadow-sm dark:bg-white/10 dark:border-white/20 dark:text-white dark:shadow-none"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                        )}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="mb-3">
                                <h4 className="text-lg font-bold transition-colors text-slate-900 dark:text-slate-200">
                                    Writing Style
                                </h4>
                                <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                                    Defines tone and presentation.
                                </p>
                            </div>

                            <div className="flex gap-2.5 flex-wrap">
                                {styleOptions.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            setStyle(s)
                                            updateMutation.mutate({ field: "tone", value: s })
                                        }}
                                        className={clsx(
                                            "px-4 py-2 text-sm rounded-lg border transition-all duration-200 font-medium",
                                            style === s
                                                ? "bg-slate-800 border-slate-800 text-white shadow-sm dark:bg-white/10 dark:border-white/20 dark:text-white dark:shadow-none"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}