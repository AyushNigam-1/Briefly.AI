"use client"

import React, { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import api from "@/app/api"

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
        <div className="space-y-6">

            <div>
                <h3 className="text-xl font-semibold text-slate-300">
                    Custom Instructions
                </h3>
                <p className="text-sm text-slate-500">
                    Persistent behavior across all chats.
                </p>
            </div>

            <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                className="w-full h-40 bg-white/5 rounded-xl p-4 custom-scrollbar text-sm text-slate-200 outline-none resize-none border border-secondary focus:ring-1 focus:ring-white/20"
                placeholder="I am a developer. Prefer concise answers. Show code examples."
            />

            <div>
                <h4 className="text-lg font-semibold text-slate-300">Verbosity</h4>
                <p className="text-sm text-slate-500">
                    Controls how long and detailed replies should be.
                </p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {verbosityOptions.map(v => (
                    <button
                        key={v}
                        onClick={() => {
                            setVerbosity(v)
                            updateField("verbosity", v)
                        }}
                        className={clsx(
                            "px-4 py-2 text-sm rounded-lg border transition",
                            verbosity === v
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white/5 border-secondary text-slate-400 hover:bg-white/10"
                        )}
                    >
                        {v}
                    </button>
                ))}
            </div>

            <div>
                <h4 className="text-lg font-semibold text-slate-300">Writing Style</h4>
                <p className="text-sm text-slate-500">
                    Defines tone and presentation.
                </p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {styleOptions.map(s => (
                    <button
                        key={s}
                        onClick={() => {
                            setStyle(s)
                            updateField("tone", s)
                        }}
                        className={clsx(
                            "px-4 py-2 text-sm rounded-lg border transition",
                            style === s
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white/5 border-secondary text-slate-400 hover:bg-white/10"
                        )}
                    >
                        {s}
                    </button>
                ))}
            </div>

        </div>
    )
}
