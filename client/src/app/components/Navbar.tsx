"use client"
import Link from 'next/link'
import React, { ReactNode } from 'react'
import Cookies from "js-cookie";
import Dropdown from './Dropdown';
interface NavbarProps {
    component?: ReactNode;
}
const Navbar: React.FC<NavbarProps> = ({ component }) => {
const option = [{
    name: 'Profile', svg: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
),route:'/profile',color:''
}, {
    name: 'Logout', svg: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>

        ), route: '/account/logout', color: ''
    }]
    return (
        <div className='w-full p-2 mx-auto container text-white relative flex items-center justify-between font-mono'>
            {component}
            <p className='text-lg' >
                Briefly.AI
            </p>
            {/* {
                Cookies.get("access_token") ?<Dropdown options={option} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>} />  
                    : <div className='flex gap-2' >
                        <Link href="/account/login" className='bg-gray-700/50 py-2 px-5 rounded-md' > Login </Link>
                        <Link href="/account/signup" className='bg-gray-700/50 py-2 px-5 rounded-md' > Signup </Link>
                    </div>
            } */}
        </div>
    )
}

export default Navbar