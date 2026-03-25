"use client"

import { InputProps } from '@/app/types';
import { MenuButton, MenuItem, MenuItems, Menu } from '@headlessui/react';
import clsx from 'clsx';
import { FileText, ImageIcon, Plus, PauseCircle, SendHorizontal, X, Lock, CheckCircle, ChevronDown, AudioLines } from 'lucide-react';
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion';

// 🌟 FIX: We only need the Next.js router hooks now!
import { useRouter, useSearchParams } from 'next/navigation';

const options = [
    { label: "GPT OSS 20B", value: "openai/gpt-oss-20b", icon: "/openai.webp", isPremium: false, description: "Fast & efficient for everyday tasks" },
    { label: "Llama 4 Scout", value: "meta-llama/llama-4-scout-17b-16e-instruct", icon: "/meta.webp", isPremium: false, description: "Quick search & summarization" },
    { label: "Qwen 3 32B", value: "qwen/qwen3-32b", icon: "/qwen.webp", isPremium: false, description: "Strong multilingual & math skills" },
    { label: "Kimi K2", value: "moonshotai/kimi-k2-instruct-0905", icon: "/kimi.webp", isPremium: false, description: "Long context document processing" },
    { label: "GPT OSS 120B", value: "openai/gpt-oss-120b", icon: "/openai.webp", isPremium: false, description: "Advanced reasoning & complex coding" },
    { label: "Llama 70B", value: "llama-3.3-70b-versatile", icon: "/meta.webp", isPremium: false, description: "Deep analysis & creative writing" },
]

const fileItemVariants = {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.15, ease: "easeIn" }
    }
};

const InputBox = ({ query, setQuery, send, isPending, stop }: InputProps) => {
    // 🌟 FIX: Initialize the router
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeId = searchParams.get("id");

    const [selected, setSelected] = useState(options[0])
    const [files, setFiles] = useState<File[]>([]);

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
            e.target.value = '';
        }
    };

    useEffect(() => {
        const savedModelValue = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
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

    const isInputEmpty = !query.trim();

    return (
        <div className="w-full flex flex-col rounded-3xl border transition-all duration-200 bg-white border-slate-300 dark:bg-tertiary dark:border-secondary shadow-sm relative">

            {/* File Attachments Previews */}
            <AnimatePresence initial={false}>
                {files?.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-nowrap w-full items-center gap-3 overflow-x-auto scrollbar-none font-mono px-3 sm:px-4 pt-3 sm:pt-4">
                            <AnimatePresence mode="popLayout">
                                {files.map((file, index) => (
                                    <motion.div
                                        layout
                                        key={`${file.name}-${index}-${file.lastModified}`}
                                        className="relative group flex-shrink-0"
                                        variants={fileItemVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        <div className='p-1.5 sm:p-2 pr-6 sm:pr-8 flex gap-2 rounded-xl relative border transition-colors bg-slate-50 border-slate-200 text-slate-800 dark:bg-[#262626] dark:border-secondary dark:text-primary'>
                                            <div className='p-2 sm:p-3 rounded-full my-auto transition-colors flex items-center justify-center bg-slate-200 text-slate-700 dark:bg-[#333333] dark:text-tertiary'>
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
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="absolute top-1.5 right-1.5 p-1 rounded-full shadow-sm transition-colors z-10 bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white dark:bg-white/15 dark:text-slate-300 dark:hover:bg-white/20 dark:hover:text-white"
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && query && send(query, files, selected.value)}
                className="bg-transparent w-full min-w-0 flex-1 border-none outline-none focus:outline-none focus:ring-0 px-4 sm:px-5 pt-4 pb-3 text-base sm:text-[17px] transition-colors text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-gray-500"
                placeholder="Ask AI..."
            />

            <div className="flex justify-between items-center px-3 pb-3">

                <div className="flex items-center gap-1">
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleFileChange}
                        onClick={(e) => {
                            (e.currentTarget as HTMLInputElement).value = '';
                        }}
                    />
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer rounded-full p-2 flex items-center justify-center transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                        title="Attach Files"
                    >
                        <Plus size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </label>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <Menu as="div" className="relative flex-shrink-0">
                        <MenuButton className="flex items-center gap-2 p-1.5 pr-3 rounded-full transition-colors text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-white/10 border border-transparent hover:border-slate-200 dark:hover:border-white/10 select-none">
                            <img src={selected.icon} className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded-full" alt={selected.label} />
                            <span className="text-sm sm:text-base font-medium whitespace-nowrap hidden sm:block">{selected.label}</span>
                            <ChevronDown size={14} className="opacity-50 ml-0.5" />
                        </MenuButton>

                        <MenuItems transition className={clsx(
                            "absolute right-0 bottom-full mb-2 rounded-xl p-1 sm:p-2 z-50 w-72 sm:w-80 max-h-[60vh] overflow-y-auto space-y-1 sm:space-y-1 border shadow-lg",
                            "bg-white border-slate-200 text-slate-800",
                            "dark:bg-tertiary dark:border-secondary dark:text-primary dark:shadow-none",
                            "origin-bottom-right transition duration-200 ease-out",
                            "data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-2"
                        )}>
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

                    <AnimatePresence mode="wait">
                        {isInputEmpty ? (
                            <motion.div
                                key="voice-mic"
                                initial={{ opacity: 0, scale: 0.85, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85, y: -5 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="flex-shrink-0"
                            >
                                <button
                                    type="button"
                                    // 🌟 FIX: Click goes straight to the /voice page!
                                    onClick={() => {
                                        if (activeId) {
                                            router.push(`/voice?id=${activeId}`);
                                        } else {
                                            router.push('/voice');
                                        }
                                    }}
                                    className={clsx(
                                        "p-2.5 rounded-full flex-shrink-0 transition-all duration-200 flex items-center justify-center",
                                        "bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90 shadow-md scale-100"
                                    )}
                                    title="Start Voice Chat"
                                >
                                    <AudioLines size={16} className="sm:w-5 sm:h-5" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="text-send"
                                initial={{ opacity: 0, scale: 0.85, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85, y: -5 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="flex-shrink-0"
                            >
                                <button
                                    type="button"
                                    onClick={() => isPending ? stop() : send(query, files, selected.value)}
                                    className={clsx(
                                        "p-2.5 rounded-full flex-shrink-0 transition-all duration-200 flex items-center justify-center",
                                        "bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90 shadow-md scale-100"
                                    )}
                                >
                                    {isPending ? (
                                        <PauseCircle size={18} className="sm:w-5 sm:h-5" />
                                    ) : (
                                        <SendHorizontal size={18} className="sm:w-5 sm:h-5" />
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

export default InputBox;