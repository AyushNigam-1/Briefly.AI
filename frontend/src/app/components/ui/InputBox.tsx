"use client"
import { InputProps } from '@/app/types';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, MenuButton, MenuItem, MenuItems, Menu } from '@headlessui/react';
import clsx from 'clsx';
// 🌟 Added Check icon to the imports
import { AlarmClock, AlarmClockCheck, ChevronDown, FileText, Filter, ImageIcon, Loader2, MessageCircle, MessageSquare, Package, Paperclip, PauseCircle, SendHorizontal, SlidersHorizontal, X, Lock, Check, CheckCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

const options = [
    { label: "GPT OSS 20B", value: "openai/gpt-oss-20b", icon: "/openai.webp", isPremium: false, description: "Fast & efficient for everyday tasks" },
    { label: "Llama 4 Scout", value: "meta-llama/llama-4-scout-17b-16e-instruct", icon: "/meta.webp", isPremium: false, description: "Quick search & summarization" },
    { label: "Qwen 3 32B", value: "qwen/qwen3-32b", icon: "/qwen.webp", isPremium: false, description: "Strong multilingual & math skills" },
    { label: "Kimi K2", value: "moonshotai/kimi-k2-instruct-0905", icon: "/kimi.webp", isPremium: false, description: "Long context document processing" },
    { label: "GPT OSS 120B", value: "openai/gpt-oss-120b", icon: "/openai.webp", isPremium: true, description: "Advanced reasoning & complex coding" },
    { label: "Llama 70B", value: "llama-3.3-70b-versatile", icon: "/meta.webp", isPremium: true, description: "Deep analysis & creative writing" },
]

const InputBox = ({ query, setQuery, send, isPending, files, stop, handleFileChange, removeFile }: InputProps) => {
    const doc = useRef<HTMLInputElement | null>(null);
    const [selected, setSelected] = useState(options[0])

    useEffect(() => {
        const savedModelValue = localStorage.getItem('selectedModel');
        if (savedModelValue) {
            const foundOption = options.find(opt => opt.value === savedModelValue);
            if (foundOption && !foundOption.isPremium) {
                setSelected(foundOption);
            }
        }
    }, []);

    const handleModelChange = (item: typeof options[0]) => {
        if (item.isPremium) return;
        setSelected(item);
        localStorage.setItem('selectedModel', item.value);
    };

    return (
        <div className="flex gap-2 sm:gap-4 items-end w-full">
            <div className="w-full flex-1 space-y-3 sm:space-y-4 min-w-0">

                {files?.length !== 0 && files !== undefined &&
                    <div className="flex flex-nowrap w-full gap-3 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2 font-mono pb-2 pt-2 px-1">
                        {files?.map((file, index) => (
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

                <div className="flex rounded-[2rem] border transition-colors items-center bg-white border-slate-300 dark:bg-[#1a1a1a] dark:border-secondary">
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
                            "absolute right-0 bottom-full mb-2 sm:mb-4 rounded-xl p-1 sm:p-2 z-50 w-72 sm:w-80 max-h-[60vh] overflow-y-auto space-y-1 sm:space-y-1 border shadow-lg",
                            "bg-white border-slate-200 text-slate-800",
                            "dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none",
                            "origin-bottom-right transition duration-200 ease-out",
                            "data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-2"
                        )}
                        >
                            {/* <div className="px-2 py-1 flex gap-2 items-center uppercase font-semibold text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                <Package size={14} className="sm:w-[18px] sm:h-[18px]" /> Models
                            </div> */}
                            {/* <hr className="border transition-colors border-slate-200 dark:border-secondary mb-1" /> */}

                            {options.map((item) => (
                                <MenuItem key={item.value} disabled={item.isPremium}>
                                    {({ close, disabled }) => (
                                        <button
                                            onClick={() => { handleModelChange(item); close(); }}
                                            className={clsx(
                                                "w-full text-left flex gap-3 p-2.5 rounded-lg items-center transition-colors",
                                                disabled
                                                    ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-white/5"
                                                    : "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10",
                                                !disabled && selected.value === item.value && "font-medium bg-slate-100 border border-slate-200 text-slate-900 dark:bg-white/5 dark:border-secondary dark:text-white"
                                            )}
                                        >
                                            <img src={item.icon} className='w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0' alt={item.label} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-1">
                                                    <span className={clsx(
                                                        "font-medium text-sm sm:text-base truncate",
                                                        !disabled && selected.value === item.value && "font-semibold"
                                                    )}>
                                                        {item.label}
                                                    </span>

                                                    {/* 🌟 Swap between Lock and Check icon */}
                                                    {item.isPremium ? (
                                                        <Lock size={14} className="text-amber-500 flex-shrink-0" />
                                                    ) : selected.value === item.value ? (
                                                        <CheckCircle size={16} className="text-slate-800 dark:text-slate-200 flex-shrink-0" />
                                                    ) : null}

                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {item.description}
                                                </p>
                                            </div>
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