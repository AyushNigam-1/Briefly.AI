"use client"
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, MenuButton, MenuItem, MenuItems, Menu } from '@headlessui/react';
import clsx from 'clsx';
import { AlarmClock, AlarmClockCheck, ChevronDown, FileText, Filter, ImageIcon, Loader2, MessageCircle, MessageSquare, Package, Paperclip, PauseCircle, SendHorizontal, SlidersHorizontal } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

const options = [
    { label: "GPT OSS 120B", value: "openai/gpt-oss-120b", icon: "/openai.webp" },
    { label: "GPT OSS 20B", value: "openai/gpt-oss-20b", icon: "/openai.webp" },
    { label: "Llama 70B", value: "llama-3.3-70b-versatile", icon: "/meta.webp" },
    { label: "Llama 4 Scout", value: "meta-llama/llama-4-scout-17b-16e-instruct", icon: "/meta.webp" },
    { label: "Qwen 3 32B", value: "qwen/qwen3-32b", icon: "/qwen.webp" },
    { label: "Kimi K2", value: "moonshotai/kimi-k2-instruct-0905", icon: "/kimi.webp" },
]

const InputBox = ({ query, setQuery, send, isPending, files, stop, handleFileChange }: {
    query: string, setQuery: (value: string) => void, send: (value: string, files: File[], model: string) => void, files: File[], isPending: boolean, stop: () => void, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}) => {
    const doc = useRef<HTMLInputElement | null>(null);
    const [selected, setSelected] = useState(options[0])

    useEffect(() => {
        const savedModelValue = localStorage.getItem('selectedModel');
        if (savedModelValue) {
            const foundOption = options.find(opt => opt.value === savedModelValue);
            if (foundOption) {
                setSelected(foundOption);
            }
        }
    }, []);

    const handleModelChange = (item: typeof options[0]) => {
        setSelected(item);
        localStorage.setItem('selectedModel', item.value);
    };

    return (
        <div className="flex gap-4 items-end">
            <div className="w-full space-y-4">
                {/* 🌟 File Upload Previews */}
                {
                    files?.length != 0 && files !== undefined &&
                    <div className="flex gap-3 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2 font-mono">
                        {files?.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                                <div className='p-2 pr-6 flex gap-2 rounded-xl relative border transition-colors
                                    bg-slate-50 border-slate-200 text-slate-800 
                                    dark:bg-white/5 dark:border-secondary dark:text-primary'
                                >
                                    <div className='p-3 rounded-full my-auto transition-colors
                                        bg-slate-200 text-slate-700 
                                        dark:bg-primary dark:text-tertiary'
                                    >
                                        {file.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                    </div>

                                    <div className='flex gap-1 flex-col'>
                                        <h1 className='font-semibold truncate'>
                                            {file.name.slice(0, 14)}
                                        </h1>
                                        <p className='text-sm text-start opacity-70'>
                                            {file.size >= 1048576
                                                ? (file.size / 1048576).toFixed(2) + ' MB'
                                                : (file.size / 1024).toFixed(2) + ' KB'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                }

                {/* 🌟 Main Input Container */}
                <div className="flex rounded-full border transition-colors
                    bg-white border-slate-300 
                    dark:bg-white/5 dark:border-secondary"
                >
                    {/* Attachment Button */}
                    <button
                        className="rounded-full p-4 flex items-center justify-center transition-colors
                            bg-slate-100 text-slate-600 hover:bg-slate-200
                            dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                        onClick={() => doc.current?.click()}
                    >
                        <input
                            ref={doc}
                            type="file"
                            hidden
                            multiple
                            onChange={handleFileChange}
                        />
                        <Paperclip size={20} />
                    </button>

                    {/* Text Input */}
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && query && send(query, files, selected.value)}
                        className="bg-transparent w-full outline-none pl-2 text-lg transition-colors
                            text-slate-900 placeholder:text-slate-400 
                            dark:text-primary dark:placeholder:text-gray-500"
                        placeholder="Ask AI..."
                    />

                    {/* Model Selector Menu */}
                    <Menu as="div" className="relative">
                        <MenuButton className="flex w-fit text-nowrap items-center gap-2 p-3.5 rounded-full border transition-colors
                            bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            <Package size={20} />
                        </MenuButton>

                        <MenuItems
                            transition className={clsx(
                                "absolute right-0 bottom-full mb-4 rounded-xl p-2 z-50 min-w-[220px] space-y-2 border shadow-lg",
                                "bg-white border-slate-200 text-slate-800",
                                "dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none",
                                "origin-bottom-right transition duration-200 ease-out",
                                "data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-2"
                            )}
                        >
                            <div className="px-2 flex gap-2 items-center uppercase font-semibold
                                text-slate-500 dark:text-slate-400"
                            >
                                <Package size={18} /> Models
                            </div>
                            <hr className="border transition-colors border-slate-200 dark:border-secondary" />

                            {options.map((item) => (
                                <MenuItem key={item.value}>
                                    {() => (
                                        <button
                                            onClick={() => handleModelChange(item)}
                                            className={clsx(
                                                "w-full text-left flex gap-2 p-2 text-lg rounded-lg items-center cursor-pointer transition-colors",
                                                "hover:bg-slate-100 dark:hover:bg-white/5",
                                                selected.label === item.label && "bg-slate-100 dark:bg-white/5 font-medium"
                                            )}
                                        >
                                            <img src={item.icon} className='size-5' alt={item.label} />
                                            {item.label}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            {/* 🌟 Send / Stop Button */}
            <button
                onClick={() => isPending ? stop() : query && send(query, files, selected.value)}
                className="p-4 rounded-full transition-colors shadow-sm
                    bg-slate-900 text-white hover:bg-slate-800
                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90 dark:shadow-none"
            >
                {isPending ? (
                    <PauseCircle size={20} />
                ) : (
                    <SendHorizontal size={20} />
                )}
            </button>
        </div>
    )
}

export default InputBox;