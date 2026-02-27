import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useAuthStore } from '../../../epics/identity/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

import { Phase1Wormhole } from './scenes/Phase1Wormhole';
import { Phase2Atmosphere } from './scenes/Phase2Atmosphere';

export const CinematicLoginTransition: React.FC = () => {
    const { isTransitioning, setTransitioning } = useAuthStore();
    const [dpr, setDpr] = useState(1.5);
    const [isReducedMotion, setIsReducedMotion] = useState(false);
    const [phase, setPhase] = useState<1 | 2>(1);

    // Skip mechanism state
    const [timeScale, setTimeScale] = useState(1);

    useEffect(() => {
        // Detect reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setIsReducedMotion(mediaQuery.matches);

        const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
        if (!isTransitioning) {
            setPhase(1);
            setTimeScale(1);
        }
    }, [isTransitioning]);

    const handleSkip = () => {
        // Double-click to skip: we aggressively ramp up timeScale
        if (timeScale < 5) {
            setTimeScale(5);
        }
    };

    if (!isTransitioning) return null;

    if (isReducedMotion) {
        // Minimal 2D fallback for accessibility
        return (
            <motion.div
                className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
                    onAnimationComplete={() => setTimeout(() => setTransitioning(false), 500)}
                    className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-[0_0_30px_rgba(255,186,8,0.3)]"
                />
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] bg-black bg-opacity-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 1.5 } }} // Slow fade out when transition complete
                onDoubleClick={handleSkip}
            >
                <div className="absolute top-8 right-8 z-10 text-white/30 text-xs font-medium tracking-widest uppercase pointer-events-none user-select-none opacity-50">
                    Double-click to skip
                </div>

                <Canvas
                    gl={{ antialias: false, powerPreference: "high-performance" }}
                    dpr={dpr}
                    camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 2000 }}
                >
                    <PerformanceMonitor
                        onIncline={() => setDpr(2)}
                        onDecline={() => setDpr(1)}
                    >
                        {/* Lighting */}
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />

                        {/* Phase Rendering */}
                        {phase === 1 ? (
                            <Phase1Wormhole
                                timeScale={timeScale}
                                onComplete={() => setPhase(2)}
                            />
                        ) : (
                            <Phase2Atmosphere
                                timeScale={timeScale}
                                onComplete={() => setTransitioning(false)}
                            />
                        )}
                    </PerformanceMonitor>
                </Canvas>

                {/* Temporary manual exit for testing */}
                <button
                    onClick={() => setTransitioning(false)}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded backdrop-blur border border-white/20 text-white hover:bg-white/20 z-20"
                >
                    Complete Transition (Test)
                </button>
            </motion.div>
        </AnimatePresence>
    );
};
