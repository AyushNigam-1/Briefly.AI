import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./providers/QueryProvider";

export const metadata: Metadata = {
    title: "Briefly.ai",
    description: "Your intelligent AI assistant",
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    }
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
                    {children}
                </QueryProvider>
            </body>
        </html>
    );
}