import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SpaceDeviceFrame } from './SpaceDeviceFrame';
import { HologramProjector } from './HologramProjector';
import { Orbit } from 'lucide-react';

import { motion } from 'framer-motion';

const DESIGN_W = 1200;
const DESIGN_H = 650;

function useScaleToFit() {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const update = () => {
            const s = Math.min(
                window.innerWidth / DESIGN_W,
                window.innerHeight / DESIGN_H
            );
            setScale(Math.min(s, 1));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return scale;
}

interface IdentityLayoutProps {
    children: React.ReactNode;
    hologramWidth?: string;
    hologramHeight?: string;
    isExiting?: boolean;
    isCinematic?: boolean;
    theme?: 'amber' | 'emerald';
}

export const IdentityLayout: React.FC<IdentityLayoutProps> = ({
    children,
    hologramWidth = "880px",
    hologramHeight = "480px",
    isExiting = false,
    isCinematic = false,
    theme = 'amber'
}) => {
    const [hologramVisible, setHologramVisible] = useState(false);
    const groupScale = useScaleToFit();

    const isEmerald = theme === 'emerald';

    // Theme color mappings
    const themeClasses = {
        border: isEmerald ? 'border-emerald-500/30' : 'border-amber-500/30',
        bg: isEmerald ? 'bg-emerald-950/[0.40]' : 'bg-amber-950/[0.40]',
        glow: isEmerald ? 'bg-emerald-500/30' : 'bg-amber-500/30',
        icon: isEmerald ? 'text-emerald-100' : 'text-amber-100',
        shadow: isEmerald ? 'drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'drop-shadow-[0_0_20px_rgba(255,146,0,0.8)]'
    };

    useEffect(() => {
        if (isExiting) {
            setHologramVisible(false);
        } else {
            const timer = setTimeout(() => setHologramVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [isExiting]);

    return (
        <div className="h-[100dvh] bg-background flex items-center justify-center relative w-full overflow-hidden">
            {/* Global Cosmos Background */}
            <motion.div
                className="fixed inset-0 w-full h-full bg-[url('/Space_shuttle.png')] bg-cover bg-center bg-no-repeat mix-blend-screen pointer-events-none"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{
                    scale: isExiting && isCinematic ? 5 : 1,
                    opacity: isExiting ? (isCinematic ? 0.9 : 0.4) : 0.4
                }}
                transition={{ duration: 1.0, ease: isCinematic ? "easeIn" : "easeOut" }}
                style={{ filter: "contrast(1.2) brightness(0.8)", zIndex: 0 }}
            />
            <div className="fixed inset-0 bg-background/60 pointer-events-none" style={{ zIndex: 0 }} />

            <div
                className="relative z-10 flex-shrink-0"
                style={{
                    width: DESIGN_W,
                    height: DESIGN_H,
                    transform: `scale(${groupScale}) translateY(30px)`,
                    transformOrigin: 'center center',
                }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] z-[60]">
                    <HologramProjector isActive={hologramVisible} theme={theme}>
                        <div
                            className={cn(
                                "relative -left-[10px] rounded-2xl border backdrop-blur-[2px] overflow-hidden",
                                themeClasses.border,
                                themeClasses.bg
                            )}
                            style={{ width: hologramWidth, height: hologramHeight }}
                        >
                            {children}
                        </div>
                    </HologramProjector>
                </div>

                <SpaceDeviceFrame
                    isFlat
                    isHorizontal
                    wrapperClassName="z-50 shadow-2xl absolute left-0 right-0 mx-auto w-full h-[260px] transition-all duration-700 scale-90"
                    style={{ top: 380 }}
                    theme={theme}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className={cn("absolute w-[120px] h-[50px] rounded-[100%] blur-[20px]", themeClasses.glow)} />
                    </div>
                </SpaceDeviceFrame>

                <style dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        @keyframes ping-slow {
                            0% { transform: scale(1); opacity: 0.5; }
                            50% { transform: scale(1.5); opacity: 0.2; }
                            100% { transform: scale(1); opacity: 0.5; }
                        }
                        .animate-ping-slow {
                            animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
                        }
                    ` }} />
            </div>
        </div>
    );
};
