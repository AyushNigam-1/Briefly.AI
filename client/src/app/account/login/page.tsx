"use client"
import React, { useState, FormEvent } from 'react';
import axios from 'axios';

const page: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        const data = {
            action: 'login',
            username,
            password,
        };
        try {
            const response = await axios.post('http://localhost:8000/auth', data, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200) {
                console.log(response.data);
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

    return (
        <div className="w-screen h-screen flex justify-center items-center font-mono">
            <div className="py-6 px-8 bg-gray-700/50 rounded-md shadow-xl z-20">
                <form action="" onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        name="name"
                        id="name"
                        placeholder="Username"
                        className="w-full py-2 pl-3 bg-gray-500/50 rounded outline-none focus:ring-indigo-600"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        name="email"
                        id="email"
                        placeholder="Password"
                        className="w-full py-2 pl-3 rounded bg-gray-500/50 outline-none focus:ring-indigo-600"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <a href="#" className="text-sm font-thin text-gray-400 underline hover:text-indigo-600">Forget Password?</a>
                    <button
                        type="submit"
                        className="cursor-pointer py-2 px-4 bg-gray-500/50 text-white font-bold w-full rounded"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default page;
