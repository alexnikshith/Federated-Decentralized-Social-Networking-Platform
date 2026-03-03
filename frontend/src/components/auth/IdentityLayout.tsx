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
}

export const IdentityLayout: React.FC<IdentityLayoutProps> = ({
    children,
    hologramWidth = "880px",
    hologramHeight = "480px",
    isExiting = false
}) => {
    const [hologramVisible, setHologramVisible] = useState(false);
    const groupScale = useScaleToFit();

    useEffect(() => {
        const timer = setTimeout(() => setHologramVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="h-[100dvh] bg-background flex items-center justify-center relative w-full overflow-hidden">
            {/* Global Cosmos Background */}
            <motion.div
                className="fixed inset-0 w-full h-full bg-[url('/Space_shuttle.png')] bg-cover bg-center bg-no-repeat mix-blend-screen pointer-events-none"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{
                    scale: isExiting ? 5 : 1,
                    opacity: isExiting ? 0.9 : 0.4
                }}
                transition={{ duration: 1.2, ease: "easeIn" }}
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
                    <HologramProjector isActive={hologramVisible}>
                        <div
                            className="relative -left-[10px] rounded-2xl border border-amber-500/30 bg-amber-950/[0.40] backdrop-blur-[2px] overflow-hidden"
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
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="absolute w-[100px] h-[40px] bg-amber-500/30 rounded-[100%] blur-[15px]" />
                        <Orbit className="relative w-16 h-16 text-amber-100 drop-shadow-[0_0_20px_rgba(255,146,0,0.8)]" style={{ animation: 'spin 12s linear infinite' }} />
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
