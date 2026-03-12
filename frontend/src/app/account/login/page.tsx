"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '@/app/components/providers/AuthProvider';


const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter()
    const { login } = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        if (!captchaToken) {
            toast.error("Please complete the CAPTCHA check.");
            setLoading(false);
            return;
        }

        try {
            await login({
                action: "login",
                username,
                password,
                captcha_token: captchaToken,
            });

            toast.success("Login successful!");
            router.push("/");
        } catch (err: any) {
            const message = err?.response?.data?.detail || err?.message || "Login failed";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-transparent overflow-hidden font-mono text-white px-4 sm:px-0">

            {/* Main Card */}
            <motion.div
                className="relative z-10 w-full max-w-md"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <div className="bg-tertiary backdrop-blur-xl border border-secondary rounded-2xl p-6 sm:p-8 shadow-2xl">

                    {/* Header Section */}
                    <motion.div
                        className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="p-3 bg-white/5 rounded-full border border-white/10 shadow-inner">
                            <User size={30} className="sm:w-[35px] sm:h-[35px]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome Back</h3>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">Enter credentials to access your account</p>
                        </div>
                    </motion.div>

                    {/* Form Section */}
                    <motion.form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4 sm:gap-5"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="space-y-3 sm:space-y-4">
                            <motion.div className="group relative" variants={itemVariants}>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    placeholder="Username"
                                    required
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 sm:py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 text-sm sm:text-base"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </motion.div>
                            <motion.div className="group relative" variants={itemVariants}>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder="Password"
                                    required
                                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 sm:py-3.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 text-sm sm:text-base"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </motion.div>
                        </div>

                        <motion.div className="flex items-center justify-between mt-1" variants={itemVariants}>
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0 cursor-pointer accent-blue-500"
                                />
                                <label htmlFor="remember-me" className="p-0 text-gray-400 cursor-pointer hover:text-gray-300 select-none text-xs sm:text-sm">
                                    Remember me
                                </label>
                            </div>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">
                                Forgot Password?
                            </a>
                        </motion.div>

                        {/* 🌟 Cloudflare Turnstile Widget */}


                        <motion.button
                            type="submit"
                            disabled={loading}
                            variants={itemVariants}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="w-full bg-gray-200 text-gray-800 font-bold rounded-xl py-3 sm:py-3.5 mt-1 sm:mt-2 hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm sm:text-base"
                        >
                            {loading ? (
                                <LoaderIcon className="animate-spin w-5 h-5 sm:w-6 sm:h-6" />
                            ) : (
                                "Sign In"
                            )}
                        </motion.button>

                        <motion.div className="relative flex py-2 items-center" variants={itemVariants}>
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-3 sm:mx-4 text-gray-500 text-[10px] sm:text-xs">Or</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </motion.div>

                        <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Link
                                href='/account/signup'
                                className="w-full flex justify-center bg-white/5 border border-secondary text-white font-medium rounded-xl py-3 sm:py-3.5 hover:bg-white/10 transition-colors text-center text-sm sm:text-base"
                            >
                                Create New Account
                            </Link>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex justify-center w-full my-1">
                            <Turnstile
                                siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY!} // 🔑 Replace with your actual Site Key
                                // theme="dark"
                                onSuccess={(token) => setCaptchaToken(token)}
                                onExpire={() => setCaptchaToken(null)}
                                onError={() => toast.error("CAPTCHA verification failed. Please try again.")}
                            />
                        </motion.div>
                    </motion.form>
                </div>

                {/* Footer Text */}
                <motion.p
                    className="text-center text-gray-600 text-[10px] sm:text-xs mt-4 sm:mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    &copy; 2026 Briefly.AI. All rights reserved.
                </motion.p>
            </motion.div>
            <ToastContainer position="bottom-right" theme="dark" />
        </div>
    );
};

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
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