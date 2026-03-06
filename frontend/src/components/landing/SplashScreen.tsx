"use client"

import { useRef } from "react";
import { motion } from "framer-motion";
import { ParticleTextEffect } from "../particle-text-effect";

const SESSION_KEY = "nexus_particle_intro_seen"

export function SplashScreen() {
    // Same ref-based guard used in ParticleTextEffect —
    // evaluated once per instance, never on re-renders.
    const alreadySeenRef = useRef<boolean | null>(null)
    if (alreadySeenRef.current === null) {
        alreadySeenRef.current =
            typeof window !== "undefined" &&
            sessionStorage.getItem(SESSION_KEY) === "true"
    }

    // Already seen this session — render nothing, no black screen
    if (alreadySeenRef.current) return null

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
            {/* Full-screen Particle Effect */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <ParticleTextEffect words={["NEXUS"]} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-24 text-cyan-500/30 text-[10px] font-bold tracking-[0.5em] uppercase pointer-events-none select-none"
            >
                Initializing Sovereign Link
            </motion.div>
        </motion.div>
    );
}