"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { redirect, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
const page: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
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
                router.push("/")
            } else {
                setError(response.data.detail || 'Something went wrong');
            }
        } catch (err) {
            setError('An error occurred while connecting to the server');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };
    // useEffect(() => {
    //     redirect('/');
    // }, [])

    return (
        <div className="w-screen h-screen flex justify-center items-center font-mono">
            <div className="rounded-lg shadow-xl z-20 bg-gradient-to-t from-blue-500  to-gray-900 p-1">
                <div className='p-8 bg-gray-900 rounded-lg' >
                    <form action="" onSubmit={handleSubmit} className="flex flex-col gap-6 ">
                        <span className='bg-gray-700 p-1.5 w-min rounded-full self-center'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        </span>
                        <h3 className='text-4xl font-mulish font-extrabold self-center text-gray-200' >Login</h3>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="Username"
                            className="w-80 py-4 rounded-lg pl-3 bg-gray-700  outline-none focus:ring-indigo-600"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            name="password"
                            id="password"
                            placeholder="Password"
                            className="py-4 pl-3 rounded-lg w-80  bg-gray-500/50 outline-none focus:ring-indigo-600"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <div className="text-red-500 text-sm">{error}</div>}
                        <a href="#" className="text-sm font-thin text-gray-400 underline hover:text-indigo-600">Forget Password?</a>
                        <button
                            type="submit"
                            className='bg-gradient-to-t from-red-500 to-gray-700 p-1 rounded'

                            disabled={loading}
                        >
                            <span className="cursor-pointer py-2 px-4 flex justify-center bg-gray-700 text-white font-bold w-full rounded" >
                                {loading ? <Image src="/805.svg" alt="loader" width="20" height="20" />
                                    : 'Login'}
                            </span>
                        </button>
                        <Link
                            className='bg-gradient-to-t from-blue-500 to-gray-700 p-1 rounded'
                            href='/account/signup'
                        >
                            <span className="cursor-pointer py-2 px-4 flex justify-center bg-gray-700 text-white font-bold w-full rounded"
                            >
                                Create New Account
                            </span>
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default page;
