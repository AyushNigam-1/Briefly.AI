"use client"

import axios from "axios"
import React, { useEffect, useRef, useState } from "react"
import clsx from "clsx"

type Tone = "Concise" | "Balanced" | "Detailed" | "Ultra Short" | "Very Detailed"
type Style = "Technical" | "Casual" | "Professional" | "Storytelling" | "Educational" | "Minimal"

const tones: Tone[] = [
    "Ultra Short",
    "Concise",
    "Balanced",
    "Detailed",
    "Very Detailed",
]
const styles: Style[] = [
    "Technical",
    "Professional",
    "Casual",
    "Educational",
    "Minimal",
    "Storytelling",
]

export default function CustomInstructions() {
    const [prompt, setPrompt] = useState("")
    const [tone, setTone] = useState<Tone>("Balanced")
    const [style, setStyle] = useState<Style>("Technical")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const debounce = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        axios.get("http://localhost:8000/prompt/get").then(res => {
            if (res.data?.prompt) setPrompt(res.data.prompt)
        })
    }, [])

    const save = async () => {
        setSaving(true)
        setSaved(false)

        await axios.post("/prompt/update", {
            new_prompt: `${prompt}\nTone:${tone}\nStyle:${style}`
        })

        setSaving(false)
        setSaved(true)

        setTimeout(() => setSaved(false), 2000)
    }

    // Debounced autosave
    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(save, 800)
    }, [prompt, tone, style])

    // Cmd + S
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault()
                save()
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [prompt, tone, style])

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div>
                <h3 className="text-xl font-semibold text-slate-300">Custom Instructions</h3>
                <p className="text-sm text-slate-500">
                    Persistent behavior across all chats.
                </p>
            </div>

            {/* PROMPT */}
            <div className="relative">
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full h-40 bg-white/5 rounded-xl p-4 text-sm text-slate-200 outline-none resize-none border border-secondary focus:ring-1 focus:ring-white/20"
                    placeholder="I am a developer. Prefer concise answers. Show code examples."
                />

                <div className="absolute bottom-2 right-3 text-xs text-slate-500">
                    {prompt.length}/1000
                </div>
            </div>

            {/* TONE */}
            <div>
                <h4 className="text-lg font-semibold text-slate-300">Verbosity</h4>
                <p className="text-sm text-slate-500">
                    Controls how long and detailed responses should be.
                </p>
            </div>

            <div className="flex gap-3 flex-wrap">
                {tones.map(t => (
                    <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={clsx(
                            "px-4 py-2 text-sm rounded-lg border transition",
                            tone === t
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white/5 border-secondary text-slate-400 hover:bg-white/10"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* STYLE */}
            <section className="space-y-2">
                <div>
                    <h4 className="text-lg font-semibold text-slate-300">Writing Style</h4>
                    <p className="text-sm text-slate-500">
                        Defines the assistant’s tone and presentation.
                    </p>
                </div>
            </section>
            <div className="flex gap-3 flex-wrap">
                {styles.map(s => (
                    <button
                        key={s}
                        onClick={() => setStyle(s)}
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
