"use client"

import { motion } from "framer-motion";
import { ParticleTextEffect } from "../particle-text-effect";

export function SplashScreen() {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
            <div className="w-full max-w-5xl px-4 pointer-events-none select-none flex flex-col items-center">
                <ParticleTextEffect words={["NEXUS"]} />

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-8 text-cyan-500/30 text-[10px] font-bold tracking-[0.5em] uppercase"
                >
                    Initializing Sovereign Link
                </motion.div>
            </div>
        </motion.div>
    );
}
