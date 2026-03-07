"use client";

import React from "react";
import { Description, Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { Trash2 } from "lucide-react";
import { DeleteChatDialogProps } from "@/app/types";


const DeleteChatDialog: React.FC<DeleteChatDialogProps> = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[60] font-mono">
            <DialogBackdrop
                transition
                className="fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0 bg-black/30 dark:bg-black/60"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-sm rounded-2xl border p-6 flex flex-col items-center text-center shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-tertiary dark:border-white/10 dark:shadow-black/50"
                >
                    {/* Warning Icon */}
                    <div className="p-3.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full mb-4">
                        <Trash2 size={24} strokeWidth={2} />
                    </div>

                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Delete Chat
                    </DialogTitle>

                    <Description className="text-sm leading-relaxed text-slate-500 dark:text-gray-400 mb-6">
                        This action cannot be undone. It will permanently delete this conversation and its data from your history.
                    </Description>

                    {/* Perfectly Balanced Buttons */}
                    <div className="flex w-full gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                                bg-white text-slate-700 border-slate-200 hover:bg-slate-50
                                dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                                bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-sm
                                dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20 dark:hover:bg-red-500/20"
                        >
                            Delete
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
};

export default DeleteChatDialog;