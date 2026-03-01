"use client"
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { Link2, Copy, Check, X, Twitter, Linkedin, Facebook, MessageCircle, Mail } from "lucide-react";

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

    // Social media sharing links (Hover colors remain the same as they use opacity!)
    const socialLinks = [
        {
            name: "Twitter / X",
            icon: <Twitter size={24} />,
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(defaultShareText)}`,
            hoverColor: "hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30"
        },
        {
            name: "LinkedIn",
            icon: <Linkedin size={24} />,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            hoverColor: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30"
        },
        {
            name: "WhatsApp",
            icon: <MessageCircle size={24} />,
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareText + " " + shareUrl)}`,
            hoverColor: "hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30"
        },
        {
            name: "Facebook",
            icon: <Facebook size={24} />,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            hoverColor: "hover:bg-[#2477F2]/10 hover:text-[#2477F2] hover:border-[#2477F2]/30"
        },
        {
            name: "Email",
            icon: <Mail size={24} />,
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
                    className="w-full max-w-md rounded-2xl space-y-6 border p-4 shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-[#121212] dark:border-secondary dark:shadow-black/50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                            {/* <Link2 size={22} /> */}
                            <DialogTitle className="text-2xl font-bold">
                                Share Chat
                            </DialogTitle>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-md transition-colors
                                text-slate-500 hover:text-slate-900 
                                dark:text-slate-400 dark:hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Link Section */}
                    <p className="text-lg leading-relaxed text-slate-400 dark:text-slate-400">
                        Anyone with this link will be able to view this conversation.
                    </p>

                    <div className="flex items-center gap-2 p-1.5 rounded-xl transition-colors border
                        bg-slate-50 border-slate-200 focus-within:border-slate-300
                        dark:bg-[#0b0b0b] dark:border-white/10 dark:focus-within:border-white/20"
                    >
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 bg-transparent px-3 outline-none truncate transition-colors
                                text-slate-800 selection:bg-slate-200
                                dark:text-slate-300 dark:selection:bg-white/20"
                        />
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border ${copied
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                                : "bg-slate-200 text-slate-700 border-transparent hover:bg-slate-300 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/10"
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check size={16} />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>

                    {/* Social Media Links */}
                    <div className="flex justify-between gap-3">
                        {socialLinks.map((social) => (
                            <a
                                key={social.name}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Share on ${social.name}`}
                                className={`p-2.5 rounded-xl border transition-all duration-200
                                    bg-slate-50 border-slate-200 text-slate-500
                                    dark:bg-white/5 dark:border-white/5 dark:text-slate-400
                                    ${social.hoverColor}`}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>

                </DialogPanel>
            </div>
        </Dialog>
    );
}