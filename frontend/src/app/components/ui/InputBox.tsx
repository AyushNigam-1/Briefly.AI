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


const InputBox = ({ query, setQuery, send, isPending, files, setFiles, stop, handleFileChange }: {
    query: string, setQuery: (value: string) => void, send: (value: string, files: File[], model: string) => void, files: File[], setFiles: ((file: File) => void), isPending: boolean, stop: () => void, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
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
                {
                    files?.length != 0 &&
                    <div className="flex gap-3 overflow-x-auto  scrollbar-none animate-in fade-in slide-in-from-bottom-2 font-mono">
                        {files?.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                                <div className='p-2 pr-6 flex gap-2 bg-white/5 rounded-xl relative border border-secondary text-primary'>
                                    {/* Icon based on file type */}
                                    <div className='p-3 rounded-full bg-primary my-auto text-tertiary'>
                                        {file.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                    </div>

                                    <div className='flex gap-1 flex-col'>
                                        <h1 className='font-semibold truncate'>
                                            {file.name.slice(0, 14)}
                                        </h1>
                                        <p className='text-sm text-start'>
                                            {file.size >= 1048576
                                                ? (file.size / 1048576).toFixed(2) + ' MB'
                                                : (file.size / 1024).toFixed(2) + ' KB'}
                                        </p>
                                    </div>
                                </div>

                                {/* Remove Button (X) */}
                                {/* <button
                                    onClick={() => setFiles(prev => prev.filter((_, _index) => _index !== index))}
                                    className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button> */}
                            </div>
                        ))}
                    </div>
                }
                <div className="flex bg-white/5 rounded-full border border-secondary">
                    <button
                        className="bg-primary rounded-full  p-4 flex items-center justify-center text-tertiary"
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

                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && query && send(query, files, selected.value)}
                        className="bg-transparent w-full outline-none pl-2 text-lg text-primary"
                        placeholder="Ask AI..."
                    />
                    <Menu
                        as="div" className="relative">
                        <MenuButton className="flex w-fit text-nowrap items-center gap-2 p-3.5 bg-white/5 border border-secondary rounded-full  text-slate-300  ">
                            <Package size={20} />
                        </MenuButton>

                        <MenuItems
                            transition className={clsx(
                                "absolute right-0 bottom-full mb-4 bg-tertiary text-primary border border-secondary rounded-xl p-2 z-50 min-w-[220px] space-y-2",
                                "origin-bottom-right transition duration-200 ease-out",
                                "data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-2"
                            )}
                        >
                            <div className=" text-slate-400 px-2 flex gap-2 items-center uppercase font-semibold">
                                <Package size={18} /> Modals
                            </div>
                            <hr className="border border-secondary" />

                            {options.map((item) => (
                                <MenuItem key={item.value}>
                                    {() => (
                                        <button
                                            onClick={() => handleModelChange(item)}
                                            className={clsx(
                                                "w-full text-left flex gap-2 p-2 hover:bg-white/5 text-lg rounded-lg items-center cursor-pointer ",
                                                selected.label == item.label && "bg-white/5"
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

            <button
                onClick={() => isPending ? stop() : query && send(query, files, selected.value)}
                className="p-4  bg-primary rounded-full text-tertiary"
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

export default InputBox