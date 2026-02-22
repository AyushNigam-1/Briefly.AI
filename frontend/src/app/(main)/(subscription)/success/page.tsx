import React from 'react';
import { CheckCircle2, ArrowRight, Sparkles, Receipt } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4 font-mono selection:bg-primary selection:text-tertiary">
            <div className="max-w-md w-full bg-[#121212] border border-secondary rounded-2xl p-8 shadow-2xl shadow-green-900/10 text-center animate-in fade-in zoom-in duration-500">

                {/* Glowing Success Icon */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping [animation-duration:3s]" />
                    <div className="relative flex items-center justify-center w-full h-full bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                        <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                </div>

                {/* Main Content */}
                <h1 className="text-3xl font-bold text-white mb-3">
                    Payment Successful
                </h1>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Welcome to the next level. Your Briefly.AI account has been upgraded and your new limits are immediately active.
                </p>

                {/* Transaction Details Card */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left space-y-3">
                    <div className="flex items-center gap-3 text-slate-300 pb-3 border-b border-white/5">
                        <Receipt size={16} className="text-slate-500" />
                        <span className="text-sm font-semibold">Transaction Details</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="text-green-400 font-medium flex items-center gap-1">
                            <Sparkles size={14} /> Active
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Billed to</span>
                        <span className="text-slate-300">Secure Stripe Checkout</span>
                    </div>
                </div>

                {/* Return Button */}
                <Link
                    href="/"
                    className="w-full group flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all duration-200"
                >
                    Return to Dashboard
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>

            </div>
        </div>
    );
}