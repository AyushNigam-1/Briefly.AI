"use client";

import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export default function OneSignalSetup() {
    const token = Cookies.get("access_token");
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;

        const runOneSignal = async () => {
            try {
                await OneSignal.init({
                    appId: "5a02c188-e5b6-40df-b48f-6c74ae820fcd",
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: {
                        enable: true,
                    } as any,
                });

                hasInitialized.current = true;

                if (token) {
                    const decodedToken: any = jwtDecode(token);
                    await OneSignal.login(decodedToken.user_id);
                }
            } catch (error) {
                console.error("OneSignal Initialization Error:", error);
            }
        };

        runOneSignal();
    }, [token]);

    return null;
}