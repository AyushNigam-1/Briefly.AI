"use client"
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
const Page = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const router = useRouter()

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8000/auth', {
                action: 'signup',
                username,
                password,
            }, {
                withCredentials: true,
            });
            localStorage.setItem('favourites', JSON.stringify(response.data.favourites));
            router.push("/")

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'An error occurred');
        }
    };

    return (
        <div className='w-screen h-screen flex justify-center items-center z-50 font-mono'>
            <div className="py-6 px-8 bg-gray-700/50 rounded-md shadow-xl">
                <form onSubmit={submitForm} className='flex flex-col gap-4'>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full py-2 pl-3 bg-gray-500/50 rounded outline-none focus:ring-indigo-600"
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-2 pl-3 rounded bg-gray-500/50 outline-none focus:ring-indigo-600"
                    />
                    <a href="#" className="text-sm font-thin text-gray-400 underline hover:text-indigo-600">
                        Forget Password?
                    </a>
                    <button type="submit" className="cursor-pointer py-2 px-4 bg-gray-500/50 text-white font-bold w-full text-center rounded">
                        Signup
                    </button>
                </form>
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};

export default Page;
