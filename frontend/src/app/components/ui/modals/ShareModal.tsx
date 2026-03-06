"use client"

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { Copy, Check, X, Twitter, Linkedin, Facebook, MessageCircle, Mail, Info } from "lucide-react";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: string;
    chatTitle?: string;
}

export default function ShareModal({ isOpen, onClose, chatId, chatTitle }: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    // Generate the full URL dynamically
    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/${chatId}`
        : `https://briefly.ai/${chatId}`;

    const defaultShareText = chatTitle
        ? `Check out this AI conversation: "${chatTitle}"`
        : "Check out this AI conversation!";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    // Social media sharing links
    const socialLinks = [
        {
            name: "Twitter / X",
            icon: <Twitter size={18} />,
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(defaultShareText)}`,
            hoverColor: "hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30"
        },
        {
            name: "LinkedIn",
            icon: <Linkedin size={18} />,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            hoverColor: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30"
        },
        {
            name: "WhatsApp",
            icon: <MessageCircle size={18} />,
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareText + " " + shareUrl)}`,
            hoverColor: "hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30"
        },
        {
            name: "Facebook",
            icon: <Facebook size={18} />,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            hoverColor: "hover:bg-[#2477F2]/10 hover:text-[#2477F2] hover:border-[#2477F2]/30"
        },
        {
            name: "Email",
            icon: <Mail size={18} />,
            url: `mailto:?subject=${encodeURIComponent(defaultShareText)}&body=${encodeURIComponent(shareUrl)}`,
            hoverColor: "hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/30"
        }
    ];

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="relative z-[60] font-mono"
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0
                    bg-black/30 dark:bg-black/60"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-md rounded-2xl space-y-5 p-4 flex flex-col border transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-tertiary dark:border-secondary overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Share Chat
                        </DialogTitle>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Link Input Section */}
                    <div className="flex items-center gap-2 p-1.5 rounded-xl transition-colors border
                            bg-slate-50 border-slate-200 focus-within:border-slate-300 focus-within:bg-white
                            dark:bg-[#161616] dark:border-white/10 dark:focus-within:border-white/20 dark:focus-within:bg-[#1a1a1a]"
                    >
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 bg-transparent px-3 text-sm font-medium outline-none truncate transition-colors
                                    text-slate-700 selection:bg-slate-200
                                    dark:text-slate-300 dark:selection:bg-white/20"
                        />
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border shrink-0 ${copied
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                                : "bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10"
                                }`}
                        >
                            {copied ? (
                                <Check size={14} strokeWidth={2.5} />
                            ) : (
                                <Copy size={14} />
                            )}
                        </button>
                    </div>

                    {/* Subtle Warning Callout */}
                    <div className="flex items-start gap-3 text-slate-600 dark:text-gray-400">
                        <Info size={18} className="shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed ">
                            Anyone with this link will be able to view this conversation.
                        </p>
                    </div>

                    {/* Social Media Links */}
                    <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
                            Share via
                        </p>
                        <div className="flex justify-between gap-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Share on ${social.name}`}
                                    className={`flex-1 flex justify-center items-center py-2.5 rounded-xl border transition-all duration-200
                                            bg-white border-slate-200 text-slate-500 shadow-sm
                                            dark:bg-white/5 dark:border-white/10 dark:text-slate-400
                                            ${social.hoverColor}`}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}