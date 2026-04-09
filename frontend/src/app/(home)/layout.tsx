"use client";
import React, { Suspense } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import OneSignalSetup from "../providers/OneSignalProvider";
import { authClient } from "../lib/auth-client";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { data: session, isPending } = authClient.useSession();

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center w-full h-screen">
                <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
        }>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    classNames: {
                        toast: '!bg-secondary !border !border-white/10 !text-slate-200 font-mono shadow-xl rounded-xl p-4 w-full',
                        title: 'text-sm font-medium',
                        description: 'text-xs text-slate-400',
                        success: 'group-[.toaster]:!bg-[#0b0b0b] group-[.toaster]:!text-green-400 group-[.toaster]:!border-green-900/50',
                        error: 'group-[.toaster]:!bg-[#0b0b0b] group-[.toaster]:!text-red-400 group-[.toaster]:!border-red-900/50',
                        closeButton: '!bg-transparent !text-slate-400 hover:!text-white',
                    },
                }}
            />


            <div className="flex h-screen w-full relative max-w-4xl mx-auto">
                <OneSignalSetup />
                <Sidebar user={session?.user} isLoading={isPending} />

                <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
                    <Navbar user={session?.user} isLoading={isPending} />

                    <main className="flex-1 overflow-y-hidden relative z-10">
                        <div className="w-full h-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </Suspense>
    );
}