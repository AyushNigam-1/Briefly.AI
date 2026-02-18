"use client"

import axios from "axios"
import React, { useEffect, useState } from "react"

interface UserProfile {
    nickname?: string
    occupation?: string
    about?: string
    email?: string
    phone?: string
}

export default function ProfilePanel() {
    const [profile, setProfile] = useState<UserProfile>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        axios.get("/profile").then(res => {
            setProfile(res.data)
        })
    }, [])

    const update = async (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }))

        await axios.put("/profile", {
            [field]: value
        })
    }

    return (
        <div className="space-y-5 ">
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-secondary">
                <div className="h-12 w-12 rounded-full bg-primary  flex items-center justify-center font-bold ">
                    {"A"}
                </div>
                <div className="text-primary ">
                    <p className="font-semibold">{"Ayush"}</p>
                    <p className="text-sm text-slate-400">
                        ayu@briefly.ai
                    </p>
                </div>
            </div>
            <Field
                label="Email"
                value={profile.email}
                onChange={(v) => update("email", v)}
            />

            <Field
                label="Phone"
                value={profile.phone}
                onChange={(v) => update("phone", v)}
            />
            <div>
                <h3 className="text-xl font-semibold text-slate-300">
                    About You
                </h3>
                <p className="text-sm text-slate-500">
                    This helps personalize your AI experience.
                </p>
            </div>
            <Field
                label="Nickname"
                value={profile.nickname}
                onChange={(v) => update("nickname", v)}
            />

            <Field
                label="Occupation"
                value={profile.occupation}
                onChange={(v) => update("occupation", v)}
            />

            <Textarea
                label="More About You"
                value={profile.about}
                onChange={(v) => update("about", v)}
            />
        </div>
    )
}

/* ---------------- Inputs ---------------- */

interface FieldProps {
    label: string
    value?: string
    onChange: (v: string) => void
}

function Field({ label, value, onChange }: FieldProps) {
    return (
        <div>
            <p className="text-sm text-slate-400">{label}</p>
            <input
                value={value || ""}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-white/5 border border-secondary rounded-xl px-3 py-2 outline-none text-slate-200"
            />
        </div>
    )
}

function Textarea({ label, value, onChange }: FieldProps) {
    return (
        <div>
            <p className="text-sm text-slate-400">{label}</p>
            <textarea
                value={value || ""}
                onChange={e => onChange(e.target.value)}
                className="w-full h-28 bg-white/5 border border-secondary rounded-xl px-3 py-2 outline-none text-slate-200 resize-none"
            />
        </div>
    )
}
