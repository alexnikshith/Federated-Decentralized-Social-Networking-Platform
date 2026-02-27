import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useAuthStore, TransitionState } from '../../../epics/identity/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

import { Phase1Wormhole } from './scenes/Phase1Wormhole';
import { Phase2Atmosphere } from './scenes/Phase2Atmosphere';

export const CinematicLoginTransition: React.FC = () => {
    const { isTransitioning, transitionState, setTransitionState, setTransitioning } = useAuthStore();
    const [dpr, setDpr] = useState(1.5);
    const [isReducedMotion, setIsReducedMotion] = useState(false);

    // Skip mechanism state
    const [timeScale, setTimeScale] = useState(1);
    const [isSkipping, setIsSkipping] = useState(false);

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
            setTransitionState(TransitionState.IDLE);
            setTimeScale(1);
        }
    }, [isTransitioning, setTransitionState]);

    useEffect(() => {
        if (isSkipping) {
            let currentScale = timeScale;
            const targetScale = 12; // Cap at 12x speed for smooth extremely fast-forward
            const interval = setInterval(() => {
                currentScale += (targetScale - currentScale) * 0.08;
                setTimeScale(currentScale);
                if (currentScale > 11.5) clearInterval(interval);
            }, 16); // 60fps interpolation
            return () => clearInterval(interval);
        }
    }, [isSkipping]);

    const handleSkip = () => {
        // Double-click to skip: interpolate timeScale smoothly upwards
        if (!isSkipping) {
            setIsSkipping(true);
        }
    };

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
            {isTransitioning && transitionState !== TransitionState.COMPLETE && transitionState !== TransitionState.IDLE && (
                <motion.div
                    className="fixed inset-0 z-[100]"
                    style={{ backgroundColor: transitionState === TransitionState.PRE_WARP_NEBULA ? 'transparent' : '#000000' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: transitionState === TransitionState.DOM_HANDOFF ? 0 : 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }} // Fade out over 1.5s during DOM_HANDOFF
                    exit={{ opacity: 0, transition: { duration: 0.5 } }} // Final cleanup
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
                            {/* Realistic Space Lighting */}
                            <ambientLight intensity={0.1} />
                            <directionalLight position={[500, 200, 200]} intensity={1.5} color="#ffffff" />
                            <directionalLight position={[-500, -200, -200]} intensity={0.1} color="#4CC9F0" /> {/* Slight rim bounce */}

                            {/* Phase Orchestration via FSM */}
                            {((transitionState === TransitionState.PRE_WARP_NEBULA) || (transitionState === TransitionState.WORMHOLE_TRAVEL) || (transitionState === TransitionState.WHITE_FLASH)) && (
                                <Phase1Wormhole
                                    timeScale={timeScale}
                                    isPreWarp={transitionState === TransitionState.PRE_WARP_NEBULA}
                                    onComplete={() => setTransitionState(TransitionState.PLANET_APPROACH)}
                                />
                            )}

                            {(transitionState === TransitionState.PLANET_APPROACH ||
                                transitionState === TransitionState.ATMOSPHERIC_ENTRY ||
                                transitionState === TransitionState.DOM_HANDOFF) && (
                                    <React.Suspense fallback={null}>
                                        <Phase2Atmosphere
                                            timeScale={timeScale}
                                            onComplete={() => {
                                                setTransitionState(TransitionState.COMPLETE);
                                                setTransitioning(false);
                                            }}
                                        />
                                    </React.Suspense>
                                )}
                        </PerformanceMonitor>
                    </Canvas>

                    {/* Explicit White DOM Mask to hide 3D clipping and React Suspense loading periods */}
                    <motion.div
                        className="fixed inset-0 bg-white z-[200] pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: (transitionState === TransitionState.WHITE_FLASH || transitionState === TransitionState.PLANET_APPROACH) ? 1 : 0
                        }}
                        transition={{
                            // Snap to white instantly on WHITE_FLASH, then fade out slowly during PLANET_APPROACH
                            duration: transitionState === TransitionState.WHITE_FLASH ? 0 : 2.0,
                            ease: "easeOut"
                        }}
                    />

                    {/* Temporary manual exit for testing */}
                    <button
                        onClick={() => {
                            setTransitionState(TransitionState.COMPLETE);
                            setTransitioning(false);
                        }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded backdrop-blur border border-white/20 text-white hover:bg-white/20 z-20"
                    >
                        Complete Transition (Test)
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
