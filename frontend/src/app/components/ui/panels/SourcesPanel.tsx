"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/5 z-40"
                    />

                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full text-white w-72 bg-tertiary border-l border-secondary shadow-lg z-50"
                    >
                        <div className="p-4 flex flex-col h-full space-y-4 font-mono">
                            <div className="flex items-center justify-between ">
                                <h2 className="text-xl font-bold text-white">Sources</h2>
                                <button onClick={onClose}>
                                    <X size={20} className="text-gray-400 hover:text-white transition-colors" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none">
                                {!sources?.length && (
                                    <p className="text-gray-500 text-sm">No sources available.</p>
                                )}

                                {sources?.map((src, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg bg-white/5 border border-secondary hover:bg-white/10 p-2 transition-colors"
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SourcesSidebar;