"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowDown, Settings, Webhook, MessageSquare, Database, X, Check } from "lucide-react"
import api from "@/app/lib/api"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

function AutoResizeTextarea({ value, onChange, placeholder }: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    const ref = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto"
            ref.current.style.height = ref.current.scrollHeight + "px"
        }
    }, [value])

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={(e) => {
                onChange(e.target.value)
                if (ref.current) {
                    ref.current.style.height = "auto"
                    ref.current.style.height = ref.current.scrollHeight + "px"
                }
            }}
            placeholder={placeholder}
            spellCheck={false}
            rows={1}
            className="w-full bg-transparent border border-white/[0.07] hover:border-white/[0.12] focus:border-white/20 rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none transition-colors font-mono resize-none overflow-hidden placeholder:text-zinc-600"
        />
    )
}

interface WorkflowEditorModalProps {
    isOpen: boolean
    workflowId: string | null
    onClose: () => void
}

export default function TaskEditor({ isOpen, workflowId, onClose }: WorkflowEditorModalProps) {
    const queryClient = useQueryClient()
    const [localNodes, setLocalNodes] = useState<any[]>([])
    const [savedNodeField, setSavedNodeField] = useState<string | null>(null)

    const { data: workflowDetails, isLoading } = useQuery({
        queryKey: ['workflowConfig', workflowId],
        queryFn: async () => {
            const res = await api.get(`/workflows/${workflowId}`)
            return res.data.data
        },
        enabled: isOpen && !!workflowId
    })

    useEffect(() => {
        if (workflowDetails?.nodes) setLocalNodes(workflowDetails.nodes)
    }, [workflowDetails, isOpen])

    const saveMutation = useMutation({
        mutationFn: async (updatedNodes: any[]) => {
            await api.put(`/workflows/${workflowId}`, { nodes: updatedNodes })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
        },
        onError: () => {
            toast.error("Failed to save.")
        }
    })

    const handleFieldChange = useCallback((nodeId: string, fieldKey: string, newValue: string) => {
        setLocalNodes(prev => {
            const updated = prev.map(node => {
                if (node.id !== nodeId) return node
                return {
                    ...node,
                    editable_fields: node.editable_fields.map((field: any) =>
                        field.key === fieldKey ? { ...field, value: newValue } : field
                    )
                }
            })
            saveMutation.mutate(updated)
            return updated
        })
        const key = `${nodeId}-${fieldKey}`
        setSavedNodeField(key)
        setTimeout(() => setSavedNodeField(null), 1500)
    }, [saveMutation])

    const handleClose = () => {
        setLocalNodes([])
        onClose()
    }

    return (
        <Dialog open={isOpen} onClose={() => onClose()} className="relative z-[70]">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/10 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-2xl h-[60vh] min-h-[450px] flex flex-col rounded-2xl border border-white/10 bg-tertiary transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                        <h2 className="text-lg font-extrabold text-white">Task Configuration</h2>
                        <button
                            onClick={() => onClose()}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                        >
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 h-full space-y-0 scrollbar-none">
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div key="loader" className="flex h-full items-center justify-center">
                                    <Loader2 size={20} className="animate-spin text-zinc-600" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-0"
                                >
                                    {localNodes.map((node, index) => (
                                        <div key={node.id}>
                                            {index !== 0 && (
                                                <div className="flex justify-center py-2">
                                                    <ArrowDown size={12} className="text-zinc-700" />
                                                </div>
                                            )}

                                            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                                                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
                                                    <div>
                                                        <p className="text-sm font-bold text-zinc-200 leading-none">{node.name}</p>
                                                        <p className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-widest">{node.type.split('.').pop()}</p>
                                                    </div>
                                                </div>

                                                <div className="px-4 py-3 space-y-3">
                                                    {node.editable_fields.map((field: any) => {
                                                        const fieldKey = `${node.id}-${field.key}`
                                                        const isSaved = savedNodeField === fieldKey
                                                        return (
                                                            <div key={field.key}>
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                                        {field.label}
                                                                    </label>
                                                                    <AnimatePresence>
                                                                        {isSaved && (
                                                                            <motion.span
                                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                exit={{ opacity: 0 }}
                                                                                className="flex items-center gap-1 text-[10px] text-emerald-500"
                                                                            >
                                                                                <Check size={10} strokeWidth={2.5} />
                                                                                Saved
                                                                            </motion.span>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                                {field.is_json ? (
                                                                    <AutoResizeTextarea
                                                                        value={field.value || ""}
                                                                        onChange={(v) => handleFieldChange(node.id, field.key, v)}
                                                                        placeholder={`${field.label}...`}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={field.value || ""}
                                                                        onChange={(e) => handleFieldChange(node.id, field.key, e.target.value)}
                                                                        placeholder={`${field.label}...`}
                                                                        className="w-full bg-transparent border border-white/[0.07] hover:border-white/[0.12] focus:border-white/20 rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none transition-colors placeholder:text-zinc-600"
                                                                    />
                                                                )}
                                                            </div>
                                                        )
                                                    })}
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
    )
}