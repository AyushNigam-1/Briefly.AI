"use client";

import { X } from "lucide-react";
import Link from "next/link";

type Source = {
    title?: string;
    link?: string;
    snippet?: string;
};

interface SourcesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sources: Source[];
}

const SourcesSidebar: React.FC<SourcesSidebarProps> = ({
    isOpen,
    onClose,
    sources,
}) => {
    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/5 transition ${isOpen ? "opacity-100 pointer-events-auto z-40" : "opacity-0 pointer-events-none"
                    }`}
            />
            <div
                className={`fixed top-0 right-0 h-full text-white w-72 bg-tertiary border-l border-secondary shadow-lg transform transition-transform duration-300 z-50 ${isOpen ? "-translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="p-4 flex flex-col h-full space-y-4 font-mono">
                    {/* Header */}
                    <div className="flex items-center justify-between ">
                        <h2 className="text-xl font-bold text-white">Sources</h2>
                        <button onClick={onClose}>
                            <X size={20} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>
                    <hr className="border border-secondary" />

                    {/* Sources List */}
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {!sources?.length && (
                            <p className="text-gray-500 text-sm">No sources available.</p>
                        )}

                        {sources?.map((src, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg bg-white/5 border border-secondary hover:bg-white/10 p-2"
                            >
                                <Link className="space-y-2" target="_blank" href={src.link!}>
                                    <p className="text- font-semibold text-white line-clamp-1">
                                        {src.title || "Untitled"}
                                    </p>

                                    {src.snippet && (
                                        <p className="text-sm text-gray-400 line-clamp-2">
                                            {src.snippet}
                                        </p>
                                    )}

                                    {src.link && (
                                        <p className="text-xs text-primary truncate"> - {src.link}</p>
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SourcesSidebar;
