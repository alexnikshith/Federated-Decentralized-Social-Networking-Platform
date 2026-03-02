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
            < div className="relative z-10 w-full max-w-[480px] mx-auto min-h-[360px] flex items-center justify-center pt-4 pb-5 -translate-y-8" >

                {/* Dark frosted panel with orange edge glow */}
                < div className="absolute inset-y-0 -inset-x-28 rounded-2xl pointer-events-none"
                    style={{
                        background: 'linear-gradient(160deg, rgba(30, 15, 4, 0.80) 0%, rgba(60, 30, 5, 0.45) 100%)',
                        border: '1px solid rgba(200, 100, 0, 0.15)',
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
                    bottom: '5px',
                    height: '130px',
                    background: 'linear-gradient(to top, rgba(200,90,0,0.55) 0%, rgba(180,70,0,0.28) 50%, rgba(160,60,0,0.04) 62%, transparent 70%)',
                    clipPath: 'polygon(46% 100%, 54% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(18px)',
                    mixBlendMode: 'screen',
                } as React.CSSProperties}
            />
            {/* Sharper outline layer */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-[240px] pointer-events-none z-20"
                style={{
                    bottom: '5px',
                    height: '130px',
                    background: 'linear-gradient(to top, rgba(220,110,0,0.28) 0%, rgba(180,70,0,0.10) 50%, rgba(160,60,0,0.01) 62%, transparent 70%)',
                    clipPath: 'polygon(46% 100%, 54% 100%, 100% 0%, 0% 0%)',
                    filter: 'blur(5px)',
                    mixBlendMode: 'screen',
                } as React.CSSProperties}
            />
        </div >
    );
};
