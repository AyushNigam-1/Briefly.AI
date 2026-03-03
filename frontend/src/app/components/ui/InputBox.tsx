"use client"
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, MenuButton, MenuItem, MenuItems, Menu } from '@headlessui/react';
import clsx from 'clsx';
import { AlarmClock, AlarmClockCheck, ChevronDown, FileText, Filter, ImageIcon, Loader2, MessageCircle, MessageSquare, Package, Paperclip, PauseCircle, SendHorizontal, SlidersHorizontal, X } from 'lucide-react'; // 🌟 Added X icon
import React, { useEffect, useRef, useState } from 'react'

const options = [
    { label: "GPT OSS 120B", value: "openai/gpt-oss-120b", icon: "/openai.webp" },
    { label: "GPT OSS 20B", value: "openai/gpt-oss-20b", icon: "/openai.webp" },
    { label: "Llama 70B", value: "llama-3.3-70b-versatile", icon: "/meta.webp" },
    { label: "Llama 4 Scout", value: "meta-llama/llama-4-scout-17b-16e-instruct", icon: "/meta.webp" },
    { label: "Qwen 3 32B", value: "qwen/qwen3-32b", icon: "/qwen.webp" },
    { label: "Kimi K2", value: "moonshotai/kimi-k2-instruct-0905", icon: "/kimi.webp" },
]

const InputBox = ({ query, setQuery, send, isPending, files, stop, handleFileChange, removeFile }: { // 🌟 Added removeFile to props
    query: string, setQuery: (value: string) => void, send: (value: string, files: File[], model: string) => void, files: File[], isPending: boolean, stop: () => void, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>, removeFile: (index: number) => void
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
        <div className="flex gap-2 sm:gap-4 items-end w-full">
            <div className="w-full flex-1 space-y-3 sm:space-y-4 min-w-0">

                {/* 🌟 FIX: Added w-full, overflow-x-auto, pt-2 and flex-nowrap for perfect horizontal scrolling */}
                {files?.length !== 0 && files !== undefined &&
                    <div className="flex flex-nowrap w-full gap-3 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2 font-mono pb-2 pt-2 px-1">
                        {files?.map((file, index) => (
                            // flex-shrink-0 ensures the badges don't crush together
                            <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                                <div className='p-1.5 sm:p-2 pr-6 sm:pr-8 flex gap-2 rounded-xl relative border transition-colors
                                    bg-slate-50 border-slate-200 text-slate-800 
                                    dark:bg-[#1a1a1a] dark:border-secondary dark:text-primary'
                                >
                                    <div className='p-2 sm:p-3 rounded-full my-auto transition-colors flex items-center justify-center
                                        bg-slate-200 text-slate-700 
                                        dark:bg-primary dark:text-tertiary'
                                    >
                                        {file.type.startsWith('image/') ? <ImageIcon size={16} className="sm:w-5 sm:h-5" /> : <FileText size={16} className="sm:w-5 sm:h-5" />}
                                    </div>

                                    <div className='flex gap-0.5 sm:gap-1 flex-col justify-center'>
                                        <h1 className='font-semibold text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]'>
                                            {file.name}
                                        </h1>
                                        <p className='text-[10px] sm:text-xs text-start opacity-70'>
                                            {file.size >= 1048576
                                                ? (file.size / 1048576).toFixed(2) + ' MB'
                                                : (file.size / 1024).toFixed(2) + ' KB'}
                                        </p>
                                    </div>
                                </div>

                                {/* 🌟 NEW: Remove Badge Button */}
                                <button
                                    onClick={() => removeFile(index)}
                                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full shadow-sm transition-colors
                                        bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white
                                        dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-500 dark:hover:text-white"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        ))}
                    </div>
                }

                <div className="flex rounded-[2rem] border transition-colors items-center  bg-white border-slate-300 dark:bg-[#1a1a1a] dark:border-secondary">
                    <button
                        className="rounded-full p-3 flex items-center justify-center transition-colors flex-shrink-0
                            bg-slate-900 text-white hover:bg-slate-800
                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                        onClick={() => doc.current?.click()}
                    >
                        <input ref={doc} type="file" hidden multiple onChange={handleFileChange} />
                        <Paperclip size={20} className="sm:w-5 sm:h-5" />
                    </button>

                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && query && send(query, files, selected.value)}
                        className="bg-transparent w-full min-w-0 flex-1 outline-none px-2 sm:px-3 text-base sm:text-lg transition-colors
                            text-slate-900 placeholder:text-slate-400 
                            dark:text-white dark:placeholder:text-gray-500"
                        placeholder="Ask AI..."
                    />

                    <Menu as="div" className="relative flex-shrink-0">
                        <MenuButton className="flex items-center justify-center p-3 rounded-full border transition-colors
                            bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100
                            dark:bg-white/5 dark:border-secondary dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            <Package size={20} className="sm:w-5 sm:h-5" />
                        </MenuButton>

                        <MenuItems transition className={clsx(
                            "absolute right-0 bottom-full mb-2 sm:mb-4 rounded-xl p-1 sm:p-2 z-50 w-56 sm:min-w-[220px] max-h-[60vh] overflow-y-auto space-y-1 sm:space-y-2 border shadow-lg",
                            "bg-white border-slate-200 text-slate-800",
                            "dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none",
                            "origin-bottom-right transition duration-200 ease-out",
                            "data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-2"
                        )}
                        >
                            <div className="px-2 py-1 flex gap-2 items-center uppercase font-semibold text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                <Package size={14} className="sm:w-[18px] sm:h-[18px]" /> Models
                            </div>
                            <hr className="border transition-colors border-slate-200 dark:border-secondary" />

                            {options.map((item) => (
                                <MenuItem key={item.value}>
                                    {({ close }) => (
                                        <button
                                            onClick={() => { handleModelChange(item); close(); }}
                                            className={clsx(
                                                "w-full text-left flex gap-2 p-2 text-sm sm:text-base rounded-lg items-center cursor-pointer transition-colors",
                                                "hover:bg-slate-100 dark:hover:bg-white/5",
                                                selected.label === item.label && "bg-slate-100 dark:bg-white/5 font-medium"
                                            )}
                                        >
                                            <img src={item.icon} className='w-4 h-4 sm:w-5 sm:h-5 object-contain' alt={item.label} />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                        </MenuItems>
                    </Menu>
                </div>
            </div>

            <button
                onClick={() => isPending ? stop() : query && send(query, files, selected.value)}
                className="p-3 rounded-full flex-shrink-0 transition-colors shadow-sm mb-[2px] sm:mb-1
                    bg-slate-900 text-white hover:bg-slate-800
                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90 dark:shadow-none"
            >
                {isPending ? (
                    <PauseCircle size={20} className="sm:w-5 sm:h-5" />
                ) : (
                    <SendHorizontal size={20} className="sm:w-5 sm:h-5" />
                )}
            </button>
        </div>
    )
}

export default InputBox;