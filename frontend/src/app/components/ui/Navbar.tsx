"use client"
import React, { useEffect, useState } from 'react'
import { NavbarProps } from '../../types';
import { User, UserPlus } from 'lucide-react';
import SettingsDialog from './modals/Settings';
import Cookies from 'js-cookie';
import Link from 'next/link';

const Navbar: React.FC<NavbarProps> = ({ component }) => {
    const [isOpen, setOpen] = useState<boolean>(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // Check for auth token on mount to prevent hydration errors
    useEffect(() => {
        setMounted(true);
        const token = Cookies.get('access_token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    // Prevent rendering the conditional UI until the client has mounted
    if (!mounted) return null;

    return (
        <>
            {/* 🌟 Added light mode border: border-slate-200 */}
            <div className='flex justify-between relative items-center max-w-6xl mx-auto py-4 border-b border-slate-200 dark:border-secondary transition-colors duration-300'>

                {/* LEFT: Sidebar trigger (Only visible if logged in) */}
                {isLoggedIn && (
                    <div className="flex-1 flex justify-start">
                        {component}
                    </div>
                )}

                {/* CENTER: Logo */}
                {/* Note: If your logo is pure black text, you might want to add 'dark:invert' to this img tag so it turns white in dark mode! */}
                <div className="flex-1 flex justify-center lg:justify-start">
                    <img src="/logo.png" alt="Logo" className='w-32 md:w-40 h-auto' />
                </div>

                {/* RIGHT: User Menu or Auth Buttons */}
                <div className="flex-1 flex justify-end gap-3 items-center">
                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={() => setOpen(true)}
                                className="p-2.5 rounded-full flex gap-2 items-center text-lg transition-colors
                                    bg-slate-100 text-slate-700 hover:bg-slate-200
                                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                            >
                                <User size="20" />
                            </button>
                            <SettingsDialog isOpen={isOpen} setIsOpen={setOpen} />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/account/login"
                                className="px-5 py-2 font-semibold flex items-center gap-2 rounded-full transition-colors text-lg
                                    text-slate-600 bg-tertiary border border-secondary hover:bg-slate-100 hover:text-slate-200
                                    dark:text-primary dark:hover:bg-white/5"
                            >
                                <User size={20} />
                                Login
                            </Link>
                            <Link
                                href="/account/signup"
                                className="px-5 py-2 font-semibold flex items-center gap-2 rounded-full shadow-sm transition-colors
                                    bg-slate-900 text-white hover:bg-slate-800 text-lg
                                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                            >
                                <UserPlus size={20} />
                                Signup
                            </Link>
                        </>
                    )}
                </div>

            </div>
        </>
    )
}

export default Navbar;