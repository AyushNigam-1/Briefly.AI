"use client"

import api from "@/app/lib/api"
import { Switch } from "@headlessui/react"
import clsx from "clsx"
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface MemoryItem {
    id: string
    text: string
    created_at?: string
}

const Memory: React.FC = () => {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['memories'],
        queryFn: async () => {
            const res = await api.get("/memory/");
            return res.data;
        }
    });

    const memories: MemoryItem[] = data?.memories || [];
    const memoryEnabled: boolean = Boolean(data?.enabled);

    const toggleMutation = useMutation({
        mutationFn: async (val: boolean) => {
            await api.post("/memory/toggle", { enabled: val });
        },
        onMutate: async (newVal) => {
            await queryClient.cancelQueries({ queryKey: ['memories'] });
            const previousData = queryClient.getQueryData(['memories']);

            queryClient.setQueryData(['memories'], (old: any) => ({
                ...old,
                enabled: newVal
            }));

            return { previousData };
        },
        onError: (err, newVal, context) => {
            queryClient.setQueryData(['memories'], context?.previousData);
            toast.error("Failed to toggle memory settings");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/memory/${id}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['memories'] });
            const previousData = queryClient.getQueryData(['memories']);
            queryClient.setQueryData(['memories'], (old: any) => ({
                ...old,
                memories: old.memories.filter((m: MemoryItem) => m.id !== id)
            }));

            return { previousData };
        },
        onSuccess: () => {
            toast.success("Memory deleted successfully");
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['memories'], context?.previousData);
            toast.error("Failed to delete memory");
        }
    });

    return (
        <div className="flex w-full">
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center h-[80vh] sm:h-[65vh] flex-1 w-full z-10"
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
                        className="space-y-6 w-full flex-1"
                    >
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold transition-colors text-slate-900 dark:text-slate-200">
                                Saved Memories
                            </h3>
                            <p className="text-xs sm:text-sm mt-1 transition-colors text-slate-500 dark:text-slate-400">
                                Long-term facts the assistant can use during conversations.
                            </p>
                        </div>
                        <div className="border-b border-slate-200 dark:border-white/10" />

                        <div
                            className="space-y-4 scrollbar-none custom-scrollbar"
                            style={{ scrollbarGutter: "stable" }}
                        >
                            <div className="flex items-center justify-between gap-3 sm:gap-4 bg-white/5 border border-secondary rounded-xl px-3 sm:px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm sm:text-base text-slate-200 font-semibold truncate mb-0.5">
                                        Use memories in conversations
                                    </p>
                                    <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                                        Turn off to temporarily disable personalization.
                                    </p>
                                </div>

                                <Switch
                                    checked={memoryEnabled}
                                    onChange={(val) => toggleMutation.mutate(val)}
                                    className={clsx(
                                        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition",
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

                            <AnimatePresence initial={false}>
                                {memories.map(m => (
                                    <motion.div
                                        key={m.id}
                                        layout
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0, marginBottom: 0, overflow: "hidden", transition: { duration: 0.2 } }}
                                        className="relative bg-white/5 border border-secondary rounded-xl p-3.5 w-full"
                                    >
                                        <p className="text-slate-200 leading-snug text-sm whitespace-pre-wrap">
                                            {m.text}
                                        </p>

                                        <button
                                            onClick={() => deleteMutation.mutate(m.id)}
                                            disabled={deleteMutation.isPending}
                                            className="absolute -top-2.5 -right-2.5 p-1 rounded-full bg-slate-100 dark:bg-[#1e1e1e] border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 disabled:opacity-50 transition-colors shadow-sm z-10 outline-none"
                                            title="Delete Memory"
                                        >
                                            <X size={14} strokeWidth={2.5} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {memories.length === 0 && !isLoading && (
                                <motion.p
                                    layout
                                    className="text-center text-slate-500 text-sm mt-8"
                                >
                                    No memories saved yet.
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Memory