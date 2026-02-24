import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./components/providers/QueryProvider";

export const metadata: Metadata = {
    title: "Briefly.ai",
    description: "Your intelligent AI assistant", // Gave you a slightly better default description!
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
    modal: React.ReactNode;
}>) {
    return (
        < html lang="en" >
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Mulish:wght@100;200;300;400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body
                className="font-mulish antialiased bg-fixed bg-cover bg-center h-screen transition-colors duration-300
                    bg-white text-slate-900 
                    dark:bg-[#0b0b0b] dark:text-white"
            >
                <QueryProvider>
                    <div className="relative max-h-screen max-w-screen">
                        <div className="relative z-10">{children}</div>
                    </div>
                </QueryProvider>
            </body>
        </html >
    );
}