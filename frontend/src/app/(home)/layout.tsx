"use client";
import React, { Suspense } from "react";
import Sidebar from "../components/ui/panels/Sidebar";
import Navbar from "../components/ui/Navbar";
import OneSignalSetup from "../providers/OneSignalProvider";
import { authClient } from "../lib/auth-client";
import { Loader2 } from "lucide-react";

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