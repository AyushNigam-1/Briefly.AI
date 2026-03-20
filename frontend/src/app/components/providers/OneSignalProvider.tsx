"use client";

import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { authClient } from '@/app/lib/auth-client';

export default function OneSignalSetup() {
    const hasInitialized = useRef(false);
    const { data } = authClient.useSession();
    const userId = data?.user?.id;

    useEffect(() => {
        if (hasInitialized.current) return;

        const initOneSignal = async () => {
            try {
                await OneSignal.init({
                    appId: "5a02c188-e5b6-40df-b48f-6c74ae820fcd",
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: {
                        enable: true,
                    } as any,
                });
                hasInitialized.current = true;
                console.log("✅ OneSignal Initialized");
            } catch (error) {
                console.error("OneSignal Initialization Error:", error);
            }
        };

        initOneSignal();
    }, []); // Empty array ensures this only ever runs once

    // EFFECT 2: Log the user in whenever we get their userId from Better Auth
    useEffect(() => {
        const loginToOneSignal = async () => {
            // Wait until OneSignal is ready AND we have a userId
            if (hasInitialized.current && userId) {
                try {
                    console.log("✅ Logging into OneSignal with ID:", userId);
                    await OneSignal.login(userId);
                } catch (error) {
                    console.error("OneSignal Login Error:", error);
                }
            }
        };

        loginToOneSignal();
    }, [userId]);

    return null;
}