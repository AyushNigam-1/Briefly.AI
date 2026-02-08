"use client"
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Ensure CSS is imported
import { User } from 'lucide-react';

const LoginPage: React.FC = () => {

    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const username = formData.get("name") as string;
        const password = formData.get("password") as string;
        const data = {
            action: 'login',
            username,
            password,
        };
        try {
            const response = await axios.post('http://localhost:8000/auth', data, {
                withCredentials: true,
            });
            if (response.status === 200) {
                localStorage.setItem('favourites', JSON.stringify(response.data.favourites));
                router.push("/")
            } else {
                toast.error("Something went wrong")
            }
        } catch (err) {
            toast.error("Invalid credentials or server error")
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-transparent overflow-hidden font-mono text-white">

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md p-1">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {/* Header Section */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="p-3 bg-white/5 rounded-full border border-white/10 shadow-inner">
                            <User size={35} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h3>
                            <p className="text-sm text-gray-400 mt-1">Enter your credentials to access your account</p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="space-y-4">
                            <div className="group relative">
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    placeholder="Username"
                                    required
                                    className="w-full bg-black/20 border border-white/10 text-white  rounded-xl px-4 py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="group relative">
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder="Password"
                                    required
                                    className="w-full bg-black/20 border border-white/10 text-white  rounded-xl px-4 py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0 cursor-pointer accent-blue-500"
                                />
                                <label htmlFor="remember-me" className="p-0  text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                                    Remember me
                                </label>
                            </div>
                            <a href="#" className=" text-gray-400 hover:text-white transition-colors">
                                Forgot Password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-200 text-gray-800 font-bold rounded-xl py-3.5 mt-2 hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <LoaderIcon className="animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-xs">Or</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <Link
                            href='/account/signup'
                            className="w-full bg-white/5 border border-white/10 text-white font-medium rounded-xl py-3.5 hover:bg-white/10 transition-colors text-center text-sm"
                        >
                            Create New Account
                        </Link>
                    </form>
                </div>

                {/* Footer Text */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    &copy; 2026 Briefly.AI. All rights reserved.
                </p>
            </div>
            <ToastContainer position="bottom-right" theme="dark" />
        </div>
    );
};

// Simple SVG Loader component to replace external image dependency
const LoaderIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

export default LoginPage;