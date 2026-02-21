"use client"
import React, { useEffect, useState } from 'react'
import { NavbarProps } from '../../types';
import { User } from 'lucide-react';
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
        <div className='flex justify-between relative items-center max-w-6xl mx-auto py-4 border-b-2 border-secondary' >

            {/* LEFT: Sidebar trigger (Only visible if logged in) */}
            {isLoggedIn && <div className="flex-1 flex justify-start">
                {component}
            </div>}

            {/* CENTER: Logo */}
            {/* <div className="flex-1 flex justify-center"> */}
            <img src="/logo.png" alt="Logo" className='w-40 h-auto' />
            {/* </div> */}

            {/* RIGHT: User Menu or Auth Buttons */}
            <div className="flex-1 flex justify-end gap-3 items-center">
                {isLoggedIn ? (
                    <>
                        <button
                            onClick={() => setOpen(true)}
                            className="text-tertiary bg-primary p-3 rounded-full flex gap-2 items-center text-lg"
                        >
                            <User size="20" />
                        </button>
                        <SettingsDialog isOpen={isOpen} setIsOpen={setOpen} />
                    </>
                ) : (
                    <>
                        <Link
                            href="/account/login"
                            className="px-5 py-2 font-semibold text-primary hover:bg-white/5 rounded-full transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/account/signup"
                            className="px-5 py-2 font-semibold bg-primary text-tertiary rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            Signup
                        </Link>
                    </>
                )}
            </div>

        </div>
    )
}

export default Navbar