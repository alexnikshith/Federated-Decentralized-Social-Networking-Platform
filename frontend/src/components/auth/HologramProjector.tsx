import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface HologramProjectorProps {
    children: React.ReactNode;
    className?: string;
    isActive?: boolean;
    theme?: 'amber' | 'emerald';
}

// ── Static Particles Component ──
// We move particles to a separate component and memoize it with an empty dependency array
// so they flow continuously without being affected by parent re-renders (like typing).
const StaticParticles = React.memo(({ theme = 'amber' }: { theme?: 'amber' | 'emerald' }) => {
    const particles = useMemo(() => {
        return [...Array(24)].map((_, i) => ({
            id: i,
            left: `${Math.random() * 80 + 10}%`,
            bottom: `${Math.random() * 60}%`,
            delay: `${Math.random() * 5}s`,
            duration: `${Math.random() * 10 + 10}s`,
            opacity: Math.random() * 0.7 + 0.3,
        }));
    }, []);

    return (
        <div className="absolute inset-x-[-150px] inset-y-0 pointer-events-none z-[70] overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className={cn(
                        "absolute w-[2px] h-[2px] rounded-full animate-float",
                        theme === 'emerald' ? "bg-emerald-400/50" : "bg-amber-400/50"
                    )}
                    style={{
                        left: p.left,
                        bottom: p.bottom,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        opacity: p.opacity,
                    }}
                />
            ))}
        </div>
    );
});

StaticParticles.displayName = 'StaticParticles';

export const HologramProjector = React.memo(({ children, className, isActive = true, theme = 'amber' }: HologramProjectorProps) => {
    const themeStyles = {
        emerald: {
            scanline: 'rgba(16,185,129,0.5)',
            glowFrom: 'from-emerald-500/10',
            beam1: 'linear-gradient(to top, rgba(5,150,105,0.6) 0%, rgba(6,95,70,0.18) 20%, rgba(6,78,59,0.04) 35%, transparent 50%)',
            beam2: 'linear-gradient(to top, rgba(16,185,129,0.4) 0%, rgba(6,95,70,0.08) 25%, transparent 50%)',
            beam3: 'linear-gradient(to top, rgba(52,211,153,0.3) 0%, rgba(6,95,70,0.1) 20%, transparent 50%)',
        },
        amber: {
            scanline: 'rgba(255,140,0,0.5)',
            glowFrom: 'from-amber-500/10',
            beam1: 'linear-gradient(to top, rgba(200,90,0,0.6) 0%, rgba(180,70,0,0.18) 20%, rgba(160,60,0,0.04) 35%, transparent 50%)',
            beam2: 'linear-gradient(to top, rgba(220,110,0,0.4) 0%, rgba(180,70,0,0.08) 25%, transparent 50%)',
            beam3: 'linear-gradient(to top, rgba(245,158,11,0.3) 0%, rgba(180,70,0,0.1) 20%, transparent 50%)',
        }
    };

    const currentTheme = themeStyles[theme];

    const beamStyle = {
        bottom: '30px',
        mixBlendMode: 'screen',
    } as React.CSSProperties;

    return (
        <div className={cn(
            "relative w-full transition-all duration-1000 ease-out z-[60]",
            isActive ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none",
            className
        )}>
            {/* ── Content container ── */}
            <div className="relative z-10 w-full flex items-center justify-center pt-8 pb-10 -translate-y-12">

                {/* Main holographic field background - Background removed for clean ethereal look */}
                <div className="absolute inset-y-0 -inset-x-80 rounded-[4rem] pointer-events-none overflow-hidden"
                    style={{
                        WebkitMaskImage: [
                            'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                        ].join(', '),
                        WebkitMaskComposite: 'source-in',
                        maskImage: [
                            'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                        ].join(', '),
                        maskComposite: 'intersect',
                    } as React.CSSProperties}
                >
                    {/* Subtle scanline pattern internal to the panel - Retained for texture */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: `linear-gradient(${currentTheme.scanline} 1px, transparent 1px)`,
                        backgroundSize: '100% 3px'
                    }} />

                    {/* Interior aurora/glow accent - Retained for volumetric feel */}
                    <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-1/2 bg-gradient-to-t to-transparent blur-[80px]", currentTheme.glowFrom)} />
                </div>

                <div className="w-full relative z-10 px-12">
                    <div className="animate-pulse-slow">
                        {children}
                    </div>
                </div>
            </div>

            {/* ── Beam layers ── */}
            {/* Widened Blurred glow layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[880px] pointer-events-none z-[60]"
                style={{
                    ...beamStyle,
                    height: '220px',
                    background: currentTheme.beam1,
                    clipPath: 'polygon(49.2% 100%, 50.8% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(35px)',
                }}
            />
            {/* Intermediate beam layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[720px] pointer-events-none z-[60] opacity-90"
                style={{
                    ...beamStyle,
                    height: '240px',
                    background: currentTheme.beam2,
                    clipPath: 'polygon(49.6% 100%, 50.4% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(12px)',
                }}
            />
            {/* Sharper outline layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[880px] pointer-events-none z-[60]"
                style={{
                    ...beamStyle,
                    height: '220px',
                    background: currentTheme.beam3,
                    clipPath: 'polygon(49.8% 100%, 50.2% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(2px)',
                }}
            />

            {/* Floating Energy Particles */}
            <StaticParticles theme={theme} />
        </div>
    );
});

HologramProjector.displayName = 'HologramProjector';
