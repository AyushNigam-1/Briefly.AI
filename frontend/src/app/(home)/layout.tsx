import React from "react";
import Sidebar from "../components/ui/panels/Sidebar";
import Navbar from "../components/ui/Navbar";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-full w-full relative max-w-6xl mx-auto">
            <Sidebar />
            <div className="flex flex-col flex-1 h-full w-full">
                <Navbar />
                <main className="flex-1 overflow-none relative z-10 ">
                    <div className="w-full h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}