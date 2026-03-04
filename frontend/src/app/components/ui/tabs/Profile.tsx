"use client"

import api from "@/app/api"
import { useEffect, useRef, useState } from "react"

interface UserProfile {
    username?: string
    nickname?: string
    occupation?: string
    about?: string
    email?: string
    phone?: string
}

export default function ProfilePanel() {
    const [profile, setProfile] = useState<UserProfile>({})
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        api.get("/profile").then(res => {
            setProfile(res.data)
        })
    }, [])

    const updateField = (field: keyof UserProfile, value: string) => {
        // 1. Update UI immediately
        setProfile(prev => ({ ...prev, [field]: value }))

        // 2. Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        // 3. Debounce backend call
        debounceRef.current = setTimeout(async () => {
            try {
                await api.put("/profile", {
                    [field]: value
                })
            } catch (err) {
                console.error("Profile update failed:", err)
            }
        }, 800) // 800ms feels natural
    }

    return (
        <div className="space-y-6 font-mono">
            {/* Profile Header Card */}
            <div className="flex items-center gap-4 md:p-4 p-2  rounded-xl border transition-colors
                bg-white border-slate-200 shadow-sm
                dark:bg-white/5 dark:border-secondary dark:shadow-none"
            >
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl transition-colors
                    bg-slate-100 text-slate-700
                    dark:bg-primary dark:text-tertiary"
                >
                    {"A"}
                </div>
                <div>
                    <p className="font-bold text-lg text-slate-900 dark:text-white">
                        {profile.username}
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {profile.email}
                    </p>
                </div>
            </div>

            <div className="space-y-5">
                <Field
                    label="Username"
                    value={profile.username}
                    onChange={(v) => updateField("username", v)}
                />
                <Field
                    label="Email"
                    value={profile.email}
                    onChange={(v) => updateField("email", v)}
                />

                <Field
                    label="Phone"
                    value={profile.phone}
                    onChange={(v) => updateField("phone", v)}
                />
            </div>

            <div className="pt-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                    About You
                </h3>
                <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                    This helps personalize your AI experience.
                </p>
            </div>

            <div className="space-y-5">
                <Field
                    label="Nickname"
                    value={profile.nickname}
                    onChange={(v) => updateField("nickname", v)}
                />

                <Field
                    label="Occupation"
                    value={profile.occupation}
                    onChange={(v) => updateField("occupation", v)}
                />

                <Textarea
                    label="More About You"
                    value={profile.about}
                    onChange={(v) => updateField("about", v)}
                />
            </div>
        </div>
    )
}

interface FieldProps {
    label: string
    value?: string
    onChange: (v: string) => void
}

function Field({ label, value, onChange }: FieldProps) {
    return (
        <div className="w-full">
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 transition-colors
                text-slate-700 dark:text-slate-400"
            >
                {label}
            </label>
            <input
                value={value || ""}
                onChange={e => onChange(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base outline-none transition-colors border
                    bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400 focus:bg-white
                    dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:focus:border-white/30"
            />
        </div>
    )
}

function Textarea({ label, value, onChange }: FieldProps) {
    return (
        <div className="w-full">
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 transition-colors
                text-slate-700 dark:text-slate-400"
            >
                {label}
            </label>
            <textarea
                value={value || ""}
                onChange={e => onChange(e.target.value)}
                className="w-full h-28 sm:h-32 rounded-xl px-4 py-3 text-sm sm:text-base outline-none resize-none transition-colors border
                    bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400 focus:bg-white
                    dark:bg-[#0b0b0b] dark:border-white/10 dark:text-slate-200 dark:focus:border-white/30"
            />
        </div>
    )
}