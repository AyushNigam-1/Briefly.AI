import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./components/providers/QueryProvider";
import Navbar from "./components/ui/Navbar";
import Sidebar from "./components/ui/panels/Sidebar";

export const metadata: Metadata = {
    title: "Briefly.ai",
    description: "Your intelligent AI assistant",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Mulish:wght@100;200;300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body
                className="font-mulish antialiased h-screen w-screen overflow-hidden transition-colors duration-300
                    bg-white text-slate-900 
                    dark:bg-[#0b0b0b] dark:text-white"
            >
                <QueryProvider>
                    <div className="flex h-full w-full relative">
                        <Sidebar />
                        <div className="flex flex-col flex-1 h-full w-full max-w-6xl mx-auto">
                            <Navbar />
                            <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                                {children}
                            </main>
                        </div>
                    </div>
                </QueryProvider>
            </body>
        </html>
    );
}