"use client"

import React, { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import api from "@/app/lib/api"

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
    const [instruction, setInstruction] = useState("")
    const [verbosity, setVerbosity] = useState<Verbosity>("Balanced")
    const [style, setStyle] = useState<Style>("Technical")

    const debounce = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        api.get("/preference/get").then(res => {
            setInstruction(res.data.custom_instruction || "")
            setVerbosity(res.data.verbosity || "Balanced")
            setStyle(res.data.tone || "Technical")
        })
    }, [])

    const updateField = async (field: string, value: string) => {
        await api.post("/preference/update", {
            field,
            value,
        })
    }

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current)

        debounce.current = setTimeout(() => {
            updateField("custom_instruction", instruction)
        }, 700)
    }, [instruction])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault()
                updateField("custom_instruction", instruction)
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [instruction])

    return (
        <div className="space-y-8 font-mono">

            {/* Custom Instructions Section */}
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
                        bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white
                        dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-white/30"
                    placeholder="I am a developer. Prefer concise answers. Show code examples."
                />
            </div>

            {/* Verbosity Section */}
            <div>
                <div className="mb-3">
                    <h4 className="text-lg font-bold transition-colors text-slate-900 dark:text-slate-200">
                        Verbosity
                    </h4>
                    <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                        Controls how long and detailed replies should be.
                    </p>
                </div>

                <div className="flex gap-2.5 flex-wrap">
                    {verbosityOptions.map(v => (
                        <button
                            key={v}
                            onClick={() => {
                                setVerbosity(v)
                                updateField("verbosity", v)
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

            {/* Writing Style Section */}
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
                                updateField("tone", s)
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

        </div>
    )
}