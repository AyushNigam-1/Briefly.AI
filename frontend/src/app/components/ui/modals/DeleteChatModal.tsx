import React from "react";
import { Description, Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";

interface DeleteChatDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

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
                    className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4
                        bg-white border-slate-200 shadow-slate-200/50
                        dark:bg-tertiary dark:border-secondary dark:shadow-black/50 space-y-4"
                >
                    <DialogTitle className="text-xl md:text-2xl font-bold text-center text-slate-900 dark:text-primary">
                        Delete chat?
                    </DialogTitle>

                    <Description className=" text-sm md:text-base leading-relaxed text-center text-slate-500 dark:text-slate-400">
                        This action cannot be undone. It will permanently delete this conversation from your history.
                    </Description>

                    <div className="flex justify-center gap-3 ">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl font-semibold transition-colors
                                text-slate-600 hover:text-slate-900 hover:bg-slate-100
                                dark:text-slate-300 bg-white/5 dark:hover:text-white dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="px-5 py-2.5 rounded-xl font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-200"
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