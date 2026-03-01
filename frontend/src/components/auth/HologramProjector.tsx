import React from 'react';
import { cn } from '@/lib/utils';

interface HologramProjectorProps {
    children: React.ReactNode;
    className?: string;
    isActive?: boolean;
}

export const HologramProjector = ({ children, className, isActive = true }: HologramProjectorProps) => {
    return (
        <div className={cn(
            "relative w-full transition-all duration-[1000ms] ease-out z-20",
            isActive ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none",
            className
        )}>
            {/* ── Content container ── */}
            < div className="relative z-10 w-full max-w-[480px] mx-auto min-h-[280px] flex items-center justify-center pt-3 pb-4" >

                {/* Blue frosted panel with edge fade */}
                < div className="absolute inset-y-0 -inset-x-16 rounded-2xl pointer-events-none"
                    style={{
                        background: 'linear-gradient(160deg, rgba(5, 82, 128, 0.42) 0%, rgba(14, 165, 233, 0.15) 100%)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        backdropFilter: 'blur(10px)',
                        WebkitMaskImage: [
                            'linear-gradient(to right,  transparent 0%, black 15%, black 85%, transparent 100%)',
                            'linear-gradient(to bottom, transparent 0%, black 8%,  black 88%, transparent 100%)',
                        ].join(', '),
                        WebkitMaskComposite: 'source-in',
                        maskImage: [
                            'linear-gradient(to right,  transparent 0%, black 15%, black 85%, transparent 100%)',
                            'linear-gradient(to bottom, transparent 0%, black 8%,  black 88%, transparent 100%)',
                        ].join(', '),
                        maskComposite: 'intersect',
                    } as React.CSSProperties}
                />

                < div className="w-full relative z-10" >
                    <div className="animate-pulse-slow">
                        {children}
                    </div>
                </div >
            </div >

            {/* ── Beam layers (rendered on top via z-20 + mix-blend-mode:screen) ── */}
            {/* Blurred glow layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[240px] pointer-events-none z-20"
                style={{
                    bottom: '0px',
                    height: '160px',
                    background: 'linear-gradient(to top, rgba(14,165,233,0.70) 0%, rgba(14,165,233,0.40) 50%, rgba(14,165,233,0.06) 62%, transparent 70%)',
                    clipPath: 'polygon(46% 100%, 54% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(16px)',
                    mixBlendMode: 'screen',
                } as React.CSSProperties}
            />
            {/* Sharper outline layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[240px] pointer-events-none z-20"
                style={{
                    bottom: '0px',
                    height: '160px',
                    background: 'linear-gradient(to top, rgba(14,165,233,0.40) 0%, rgba(14,165,233,0.15) 50%, rgba(14,165,233,0.02) 62%, transparent 70%)',
                    clipPath: 'polygon(46% 100%, 54% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(4px)',
                    mixBlendMode: 'screen',
                } as React.CSSProperties}
            />
        </div >
    );
};
