"use client"
import Link from 'next/link'
import React from 'react'

const Navbar = () => {
    return (
        <div className='z-50 w-full p-2 mx-auto container text-white relative flex items-center justify-between font-mono'>
            <p className='text-lg' >
                Ayush
            </p>
            <div className='flex gap-2' >
                <Link href="/account/login" className='bg-gray-700/50 py-2 px-5 rounded-md' > Login </Link>
                <Link href="/account/signup" className='bg-gray-700/50 py-2 px-5 rounded-md' > Signup </Link>
            </div>
        </div>
    )
}

export default Navbar