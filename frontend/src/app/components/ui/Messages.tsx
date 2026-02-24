import { query } from '@/app/types';
import { Copy, FileText, ImageIcon, Link, RefreshCw, VideoIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'

const Messages = ({ q, isStreaming }: { q: query, isStreaming: boolean }) => {
    const copyToClipboard = async (text?: string) => {
        if (text)
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Failed to copy text: ', err);
                return false;
            }
    };
    return (
        <>
            <div className={`flex flex-col gap-2 ${q.sender === 'user' ? 'items-end max-w-[80%]' : 'items-start'}`}>
                <div className='space-y-2 w-full'>
                    {/* 🌟 File Upload Badges */}
                    {q?.files?.length !== 0 && q.files !== undefined && (
                        <div className="flex gap-3 overflow-x-auto justify-end scrollbar-none animate-in fade-in slide-in-from-bottom-2">
                            {q.files?.map((file, idx) => (
                                <div key={`${file.name}-${idx}`} className="relative group flex-shrink-0">
                                    <div className='p-2 pr-6 flex gap-2 rounded-xl relative border transition-colors
                                                        bg-white text-slate-800 border-slate-200 
                                                        dark:bg-tertiary dark:text-primary dark:border-secondary'
                                    >
                                        <div className='p-3 rounded-full my-auto transition-colors
                                                            bg-slate-100 text-slate-600 
                                                            dark:bg-primary dark:text-tertiary'
                                        >
                                            {file.type.startsWith("image/") ? <ImageIcon size={20} /> : file.type.startsWith("video/") ? <VideoIcon size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div className='flex gap-1 flex-col'>
                                            <h1 className='font-semibold truncate'>
                                                {file.name.slice(0, 14)}
                                            </h1>
                                            <p className='text-sm text-start opacity-70'>
                                                {file.size >= 1048576 ? (file.size / 1048576).toFixed(2) + ' MB' : (file.size / 1024).toFixed(2) + ' KB'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 🌟 Chat Bubbles */}
                    {
                        q.sender == "user" ? (
                            <p className='font-medium text-lg rounded-xl p-4 border transition-colors
                                                bg-slate-50 text-slate-800 border-slate-200 
                                                dark:bg-tertiary dark:text-white dark:border-secondary'
                            >
                                {q.content}
                            </p>
                        ) : (
                            <div className={`relative ${isStreaming ? 'streaming-text-container' : ''}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    className="chatgpt-md"
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="text-3xl font-semibold mt-7 mb-4 text-slate-900 dark:text-zinc-100">
                                                {children}
                                            </h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-900 dark:text-zinc-100">
                                                {children}
                                            </h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-xl font-semibold mt-5 mb-3 text-slate-900 dark:text-zinc-100">
                                                {children}
                                            </h3>
                                        ),
                                        p: ({ children }) => (
                                            <p className="text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200 mb-4">
                                                {children}
                                            </p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="ml-6 mb-4 list-disc space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">
                                                {children}
                                            </ul>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="ml-6 mb-4 list-decimal space-y-2 text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">
                                                {children}
                                            </ol>
                                        ),
                                        li: ({ children }) => <li>{children}</li>,
                                        blockquote: ({ children }) => (
                                            <blockquote className="border-l-2 pl-4 my-5 italic text-[18px] leading-[1.8]
                                                                border-slate-300 text-slate-500 
                                                                dark:border-zinc-600 dark:text-zinc-400"
                                            >
                                                {children}
                                            </blockquote>
                                        ),
                                        code: ({ children }) =>
                                        (
                                            <pre className="rounded-xl p-5 my-5 overflow-x-auto border
                                                                    bg-slate-50 border-slate-200 
                                                                    dark:bg-zinc-900 dark:border-transparent"
                                            >
                                                <code className="text-[15px] leading-7 text-slate-800 dark:text-zinc-200">
                                                    {children}
                                                </code>
                                            </pre>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="font-semibold text-slate-900 dark:text-zinc-50">{children}</strong>
                                        ),
                                    }}
                                >
                                    {q.content}
                                </ReactMarkdown>
                            </div>
                        )
                    }
                </div>

                {/* 🌟 Action Buttons */}
                <div className="flex gap-2 justify-between w-full mt-2">
                    <div className='flex gap-2 opacity-50 hover:opacity-100 transition-opacity'>
                        <button onClick={() => copyToClipboard(q?.content)} className="p-1 transition-colors
                                            text-slate-500 hover:text-slate-900 
                                            dark:text-gray-400 dark:hover:text-white"
                            title="Copy"
                        >
                            <Copy size={16} />
                        </button>
                        {q.sender !== 'user' && (
                            <button className="p-1 transition-colors
                                                text-slate-500 hover:text-slate-900 
                                                dark:text-gray-400 dark:hover:text-white"
                                title="Regenerate"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
                    {q.sources?.length ? (
                        <button onClick={() => { setSources(q.sources!); setSourcesOpen(true) }}
                            className="flex gap-2 items-center transition-colors
                                                text-slate-500 hover:text-slate-900 
                                                dark:text-gray-400 dark:hover:text-white"
                            title="Sources"
                        >
                            <Link size={16} /> Sources
                        </button>
                    ) : null}
                </div>
            </div>
        </>
    )
}

export default Messages