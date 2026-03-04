import React from 'react';
import { cn } from '@/lib/utils';

interface CircularSpaceDeviceProps {
    className?: string;
    size?: number;
}

export const CircularSpaceDevice: React.FC<CircularSpaceDeviceProps> = ({
    className,
    size = 400
}) => {
    const height = size / 3;
    // Beams are now 30% of their previous height (was size*1.5, now size*0.45)
    // and significantly wider to fan out more
    const beamHeight = size * 0.45;
    const beamContainerWidth = size * 1.8; // wider container

    return (
        <div
            className={cn("relative flex items-center justify-center pointer-events-none", className)}
            style={{ width: size, height: height }}
        >
            {/* ── Upward Projection Beams ── */}
            <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-30"
                style={{
                    bottom: height * 0.5,
                    width: beamContainerWidth,
                    height: beamHeight,
                }}
            >
                {/* Tight central laser line */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-t from-purple-400/90 via-purple-300/40 to-transparent blur-[1px]"
                    style={{ height: '100%' }}
                />

                {/* Inner wide cone — fans out aggressively */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-t from-purple-500/40 via-purple-400/15 to-transparent blur-[18px]"
                    style={{
                        width: beamContainerWidth * 0.7,
                        height: '100%',
                        clipPath: 'polygon(50% 100%, 50% 100%, 100% 0%, 0% 0%)',
                    }}
                />

                {/* Outer ultra-wide halo cone */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-t from-purple-600/25 via-purple-500/8 to-transparent blur-[40px]"
                    style={{
                        width: beamContainerWidth,
                        height: '100%',
                        clipPath: 'polygon(47% 100%, 53% 100%, 100% 0%, 0% 0%)',
                    }}
                />

                {/* Cyan accent rim */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-t from-cyan-500/30 via-cyan-400/8 to-transparent blur-[20px]"
                    style={{
                        width: beamContainerWidth * 0.4,
                        height: '80%',
                        clipPath: 'polygon(48% 100%, 52% 100%, 100% 0%, 0% 0%)',
                    }}
                />

                {/* Edge fringe beams — soft outer glow wings */}
                <div
                    className="absolute bottom-0 left-0 bg-gradient-to-t from-purple-700/15 to-transparent blur-[30px]"
                    style={{
                        width: beamContainerWidth * 0.35,
                        height: '60%',
                        clipPath: 'polygon(80% 100%, 100% 100%, 100% 0%, 0% 20%)',
                    }}
                />
                <div
                    className="absolute bottom-0 right-0 bg-gradient-to-t from-purple-700/15 to-transparent blur-[30px]"
                    style={{
                        width: beamContainerWidth * 0.35,
                        height: '60%',
                        clipPath: 'polygon(0% 100%, 20% 100%, 100% 20%, 100% 0%)',
                    }}
                />
            </div>

            {/* ── 3D Circular Base (the disc platform) ── */}
            <div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d', transform: 'rotateX(65deg)' }}
            >
                {/* Outermost rim */}
                <div className="absolute inset-0 bg-neutral-900 rounded-[100%] border-4 border-purple-900/40 shadow-[0_0_50px_rgba(168,85,247,0.25),inset_0_0_30px_rgba(168,85,247,0.1)]" />

                {/* Mid technical ring */}
                <div className="absolute inset-[8%] rounded-[100%] border border-purple-500/30 bg-black/50">
                    <div className="absolute inset-0 rounded-[100%] border-t-2 border-purple-400/50 animate-[spin_6s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-[100%] border-b border-cyan-400/20 animate-[spin_10s_linear_infinite_reverse]" />
                </div>

                {/* Inner ring detail */}
                <div className="absolute inset-[20%] rounded-[100%] border border-purple-400/20 bg-black/60">
                    <div className="absolute inset-0 rounded-[100%] border-t border-cyan-400/30 animate-[spin_8s_linear_infinite]" />
                </div>

                {/* Central Energy Core glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/2 rounded-[100%] bg-purple-600/40 blur-[25px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/3 rounded-[100%] bg-cyan-500/30 blur-[12px] animate-pulse" style={{ animationDelay: '0.5s' }} />

                {/* Projector Lens Dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-3 bg-white/90 rounded-full blur-[1px] shadow-[0_0_20px_#a855f7,0_0_40px_#a855f7]" />

                {/* Tick marks */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-[2px] h-[6%] bg-purple-400/30 rounded-full origin-bottom"
                        style={{
                            transform: `translate(-50%, -100%) rotate(${i * 30}deg) translateY(-${size * 0.42}px)`,
                        }}
                    />
                ))}
            </div>

            {/* ── Floating Tech Rings ── */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[95%] h-full border border-purple-500/10 rounded-[100%] animate-[spin_14s_linear_infinite]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-full border border-purple-400/5 rounded-[100%] animate-[spin_18s_linear_infinite_reverse]" />
            </div>

            {/* Ground Shadow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-10 bg-black/60 rounded-[100%] blur-[20px] -z-10" />
        </div>
    );
};