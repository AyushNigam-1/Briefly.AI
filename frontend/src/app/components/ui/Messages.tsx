import { query } from '@/app/types';
import { Copy, FileText, ImageIcon, Link, RefreshCw, VideoIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessagesProps {
    q: query;
    isStreaming: boolean;
    onSourcesClick?: () => void;   // ← Fixed here
}

const Messages = ({ q, isStreaming, onSourcesClick }: MessagesProps) => {
    const copyToClipboard = async (text?: string) => {
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <div className={`flex flex-col gap-2 max-w-[80%] ${q.sender === "user" ? "items-end self-end" : "items-start self-start"
            }`}>
            <div className="space-y-2 w-full">
                {/* Files badges - unchanged */}
                {q?.files?.length !== 0 && q.files !== undefined && (
                    <div className="flex gap-3 overflow-x-auto justify-end scrollbar-none animate-in fade-in slide-in-from-bottom-2">
                        {q.files.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="relative group flex-shrink-0">
                                <div className="p-2 pr-6 flex gap-2 rounded-xl border bg-white text-slate-800 border-slate-200 dark:bg-tertiary dark:text-primary dark:border-secondary">
                                    <div className="p-3 rounded-full my-auto bg-slate-100 text-slate-600 dark:bg-primary dark:text-tertiary">
                                        {file.type.startsWith("image/") ? <ImageIcon size={20} /> : file.type.startsWith("video/") ? <VideoIcon size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="flex gap-1 flex-col">
                                        <h1 className="font-semibold truncate">{file.name.slice(0, 14)}</h1>
                                        <p className="text-sm text-start opacity-70">
                                            {file.size >= 1048576 ? (file.size / 1048576).toFixed(2) + ' MB' : (file.size / 1024).toFixed(2) + ' KB'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Chat bubble - unchanged */}
                {q.sender === "user" ? (
                    <p className="font-medium text-lg rounded-xl p-4 border bg-slate-50 text-slate-800 border-slate-200 dark:bg-tertiary dark:text-white dark:border-secondary">
                        {q.content}
                    </p>
                ) : (
                    <div className={`relative ${isStreaming ? 'streaming-text-container' : ''}`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="chatgpt-md"
                            components={{
                                // your existing components (h1, h2, p, code, etc.) - unchanged
                                p: ({ children }) => <p className="text-[18px] leading-[1.8] text-slate-700 dark:text-zinc-200">{children}</p>,
                                // ... rest of your components
                            }}
                        >
                            {q.content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-between w-full mt-2">
                <div className="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => copyToClipboard(q?.content)} className="p-1 transition-colors text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white">
                        <Copy size={16} />
                    </button>
                    {q.sender !== 'user' && (
                        <button className="p-1 transition-colors text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white">
                            <RefreshCw size={16} />
                        </button>
                    )}
                </div>

                {/* {q.sources?.length && onSourcesClick && (
                    <button
                        onClick={onSourcesClick}
                        className="flex gap-2 items-center transition-colors text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        <Link size={16} /> Sources
                    </button>
                )} */}
            </div>
        </div>
    );
};

export default Messages;