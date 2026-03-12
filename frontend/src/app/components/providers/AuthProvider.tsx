"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/api";

type User = {
    user_id: string;
    username: string;
    favorites: string[];
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    fetchUser: () => Promise<void>;
    login: (payload: { action: string; username: string; password: string; captcha_token: string }) => Promise<void>;
    signup: (payload: { action: string; username: string; password: string; captcha_token: string }) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    const fetchUser = async () => {
        try {
            const res = await api.get("/me");
            setUser(res.data.user);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (payload: { action: string; username: string; password: string; captcha_token: string }) => {
        await api.post("/auth", payload);
        await fetchUser();
    };

    const signup = async (payload: { action: string; username: string; password: string; captcha_token: string }) => {
        await api.post("/auth", payload);
        await fetchUser();
    };

    const logout = async () => {
        try {
            await api.post("/logout");
        } catch (err) {

        } finally {
            setUser(null);
            router.push("/account/login");
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, fetchUser, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};