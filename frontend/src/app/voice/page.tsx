"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, ShieldCheck, Loader2 } from "lucide-react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useVoiceAssistant,
    useDataChannel,
    useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import api from "@/app/lib/api";

const THEME = {
    disconnected: { color: "#64748b", label: "Connecting..." },
    initializing: { color: "#3b82f6", label: "Neural Sync" },
    listening: { color: "#06b6d4", label: "Listening" },
    thinking: { color: "#a855f7", label: "Thinking" },
    speaking: { color: "#10b981", label: "Speaking" },
};

function PerfectSyncWave({ state, assistantTrack, localTrackPublication }: { state: string; assistantTrack: any; localTrackPublication: any }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeTheme = THEME[state as keyof typeof THEME] || THEME.disconnected;

    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Initialize Context & Analyzer
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 128;
        analyzer.smoothingTimeConstant = 0.4;

        let animationFrame: number;
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const pillars = containerRef.current.querySelectorAll('.wave-pillar');

        // 2. Resolve the correct track based on state
        // speaking -> AI track | anything else -> Your Mic track
        const track = (state === "speaking")
            ? assistantTrack?.publication?.track?.mediaStreamTrack
            : localTrackPublication?.track?.mediaStreamTrack;

        if (track) {
            try {
                const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
                source.connect(analyzer);
            } catch (e) {
                console.error("Visualizer: Failed to create source", e);
            }
        }

        const animate = () => {
            // 🌟 CRITICAL FIX: Resume context if browser suspended it
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (state === "thinking") {
                // Hardcoded Thinking Animation
                const time = Date.now() / 250;
                pillars.forEach((pillar, i) => {
                    const sineHeight = Math.sin(time + i * 0.7) * 25 + 30;
                    (pillar as HTMLElement).style.height = `${sineHeight}px`;
                    (pillar as HTMLElement).style.opacity = "0.5";
                });
            } else {
                // Real-time voice sync (Yours or the AI's)
                analyzer.getByteFrequencyData(dataArray);
                pillars.forEach((pillar, i) => {
                    const dataIndex = Math.floor((i / pillars.length) * (analyzer.frequencyBinCount / 2));
                    const value = dataArray[dataIndex];

                    const height = Math.max(8, (value / 255) * 65);
                    (pillar as HTMLElement).style.height = `${height}px`;
                    (pillar as HTMLElement).style.opacity = `${Math.max(0.2, value / 255)}`;
                });
            }
            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrame);
            audioCtx.close();
        };
    }, [state, assistantTrack, localTrackPublication]);

    return (
        <div className="relative flex flex-col items-center justify-center w-full max-w-xs aspect-square">
            <motion.div
                animate={{ opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-full blur-[110px]"
                style={{ backgroundColor: activeTheme.color }}
            />
            <div ref={containerRef} className="flex items-center gap-2.5 h-24 z-10">
                {[...Array(9)].map((_, i) => (
                    <div
                        key={i}
                        className="wave-pillar w-2 rounded-full transition-colors duration-700"
                        style={{ backgroundColor: activeTheme.color, height: '8px' }}
                    />
                ))}
            </div>
        </div>
    );
}

function VoiceRoomUI({ onNewChatId }: { onNewChatId: (id: string) => void }) {
    const { state, audioTrack } = useVoiceAssistant();
    const { microphoneTrack } = useLocalParticipant();
    const activeTheme = THEME[state as keyof typeof THEME] || THEME.disconnected;

    useDataChannel((msg) => {
        try {
            const payload = JSON.parse(new TextDecoder().decode(msg.payload));
            if (payload.type === "new_chat") onNewChatId(payload.id);
        } catch { }
    });

    return (
        <div className="flex flex-col items-center gap-14">
            <PerfectSyncWave
                state={state}
                assistantTrack={audioTrack}
                localTrackPublication={microphoneTrack}
            />

            <motion.div
                key={state}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
            >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTheme.color }} />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/90">
                    {activeTheme.label}
                </span>
            </motion.div>
        </div>
    );
}

export default function VoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialChatId = searchParams.get("id");

    const [token, setToken] = useState("");
    const [shouldConnect, setShouldConnect] = useState(true);
    const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);

    useEffect(() => {
        const getToken = async () => {
            try {
                const url = initialChatId ? `/voice/token?chat_id=${initialChatId}` : `/voice/token`;
                const res = await api.get(url);
                setToken(res.data.token);
            } catch { router.push("/"); }
        };
        getToken();
    }, [initialChatId, router]);

    const handleExit = useCallback(() => {
        if (activeChatId) router.push(`/?id=${activeChatId}`);
        else router.push("/");
    }, [activeChatId, router]);

    return (
        <div className="relative flex flex-col items-center justify-between min-h-screen bg-[#020204] overflow-hidden">

            <div className="w-full flex justify-center pt-12 z-10">
                <AnimatePresence>
                    =                        <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-2 px-5 py-2 rounded-full"

                    >
                        <div className="flex-shrink-0 flex items-center">
                            <img src="/logo.png" alt="Logo" className='w-32 sm:w-32 md:w-40 h-auto' />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <main className="flex-1 flex items-center justify-center w-full z-10">
                <AnimatePresence mode="wait">
                    {!token ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0, filter: "blur(10px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 1.1, filter: "blur(15px)" }}
                            transition={{ duration: 0.6 }}
                            className="flex flex-col items-center gap-8"
                        >
                            <Loader2 className="text-blue-500/20 animate-spin" size={56} strokeWidth={1} />
                            <span className="text-white/10 text-[9px] font-black uppercase tracking-[0.7em]">Syncing</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="interface"
                            initial={{ opacity: 0, y: 50, filter: "blur(30px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <LiveKitRoom
                                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://127.0.0.1:7880"}
                                token={token}
                                connect={shouldConnect}
                                audio={true}
                                onDisconnected={handleExit}
                            >
                                <VoiceRoomUI onNewChatId={setActiveChatId} />
                                <RoomAudioRenderer />
                            </LiveKitRoom>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="w-full flex justify-center pb-20 z-20">
                <AnimatePresence>
                    {token && (
                        <motion.button
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShouldConnect(false)}
                            className="group flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-500 shadow-[0_0_60px_rgba(239,68,68,0.2)]"
                        >
                            <PhoneOff size={28} className="text-white" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </footer>
        </div>
    );
}