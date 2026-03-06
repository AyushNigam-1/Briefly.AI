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

    useEffect(() => {
        setMounted(true);
        const token = Cookies.get('access_token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    if (!mounted) return null;

    return (
        <>
            {/* 🌟 FIX 1: Adjusted container padding to match the standard layout and ensure items don't touch edges */}
            <div className='flex justify-between items-center p-3 md:py-3 sm:py-4  border-b border-slate-200 dark:border-secondary transition-colors duration-300 w-full'>

                {/* 🌟 FIX 2: Logo scaling for mobile */}
                <div className="flex-shrink-0 flex items-center">
                    <img src="/logo.png" alt="Logo" className='w-32 sm:w-32 md:w-40 h-auto' />
                </div>

                <div className="flex justify-end gap-2 sm:gap-3 items-center">
                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={() => setOpen(true)}
                                className="p-2 sm:p-2.5 rounded-full flex gap-2 items-center transition-colors
                                    bg-slate-100 text-slate-700 hover:bg-slate-200
                                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                            >
                                <User size="18" className="sm:w-5 sm:h-5" />
                            </button>
                            <SettingsDialog isOpen={isOpen} setIsOpen={setOpen} />
                        </>
                    ) : (
                        <>
                            {/* 🌟 FIX 3: Scaled down text and padding for buttons on small screens so they fit side-by-side */}
                            <Link
                                href="/account/login"
                                className="px-3 sm:px-5 py-1.5 sm:py-2 font-semibold flex items-center gap-1.5 sm:gap-2 rounded-full transition-colors text-sm sm:text-lg whitespace-nowrap
                                    text-slate-600 bg-tertiary border border-secondary hover:bg-slate-100 hover:text-slate-200
                                    dark:text-primary dark:hover:bg-white/5"
                            >
                                <User size={16} className="sm:w-5 sm:h-5" />
                                Login
                            </Link>
                            <Link
                                href="/account/signup"
                                className="px-3 sm:px-5 py-1.5 sm:py-2 font-semibold flex items-center gap-1.5 sm:gap-2 rounded-full shadow-sm transition-colors whitespace-nowrap
                                    bg-slate-900 text-white hover:bg-slate-800 text-sm sm:text-lg
                                    dark:bg-primary dark:text-tertiary dark:hover:bg-primary/90"
                            >
                                <UserPlus size={16} className="sm:w-5 sm:h-5" />
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