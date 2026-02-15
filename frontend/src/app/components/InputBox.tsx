"use client"
import { FileText, ImageIcon, Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import React, { useRef, useState } from 'react'

const InputBox = ({ query, setQuery, send, isPending, files, setFiles, handleFileChange }: {
    query: string, setQuery: (value: string) => void, send: (value: string, files: File[]) => void, files: File[], setFiles: ((file: File) => void), isPending: boolean, handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}) => {
    const doc = useRef<HTMLInputElement | null>(null);

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
                                    <div className='p-3 rounded-full bg-primary my-auto text-secondary'>
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
                        className="bg-primary rounded-full  p-4 flex items-center justify-center text-secondary"
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
                        onKeyDown={e => e.key === "Enter" && query && send(query, files)}
                        className="bg-transparent w-full outline-none pl-2 text-lg text-primary"
                        placeholder="Ask AI..."
                    />
                </div>
            </div>

            <button
                disabled={!query}
                onClick={() => query && send(query, files)}
                className="p-4  bg-primary rounded-full text-secondary"
            >
                {isPending ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <SendHorizontal size={20} />
                )}
            </button>
        </div>
    )
}

export default InputBox