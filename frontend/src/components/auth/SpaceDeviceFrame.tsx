import React from 'react';
import { cn } from '@/lib/utils';
import './SpaceDevice.css';

interface SpaceDeviceFrameProps {
    children: React.ReactNode;
    className?: string;
    wrapperClassName?: string;
    style?: React.CSSProperties;
    isFlat?: boolean;
    isHorizontal?: boolean;
    theme?: 'amber' | 'emerald';
}

export const SpaceDeviceFrame = ({
    children,
    className,
    wrapperClassName,
    style,
    isFlat,
    isHorizontal,
    theme = 'amber',
}: SpaceDeviceFrameProps) => {
    return (
        <div className={cn('device-wrapper', wrapperClassName)} style={style}>
            <div className={cn(
                'device-frame',
                isFlat && 'flat-mode',
                isHorizontal && 'horizontal-mode',
                theme === 'emerald' && 'emerald-theme',
            )}>
                {/* ── Antenna (shown only when upright) ── */}
                <div className="antenna" />

                {/* ═══ SIX 3-D FACES (only visible in flat mode) ═══ */}
                <div className="face-top">
                    {/* Corner bolts */}
                    <div className="bolt bolt-tl" />
                    <div className="bolt bolt-tr" />
                    <div className="bolt bolt-bl" />
                    <div className="bolt bolt-br" />

                    {/* Panel seam lines */}
                    <div className="seam seam-h upper" />
                    <div className="seam seam-h lower" />
                    <div className="seam seam-v left-seam" />
                    <div className="seam seam-v right-seam" />

                    {/* Blue indicator strip near front edge */}
                    <div className="indicator-strip" />

                    {/* Hologram emitter lens dot */}
                    <div className="energy-core" />
                </div>

                <div className="face-bottom" />

                {/* FRONT FACE — viewer-facing thick edge with vents */}
                <div className="face-front">
                    <div className="vent-group">
                        <div className="vent-slit" />
                        <div className="vent-slit" />
                        <div className="vent-slit" />
                        <div className="vent-slit" />
                        <div className="vent-slit" />
                    </div>
                </div>

                <div className="face-back" />
                <div className="face-left" />
                <div className="face-right" />

                {/* ═══ SIDE ENERGY BARS ═══ */}
                <div className="side-energy left" />
                <div className="side-energy right" />

                {/*
                  ── SCREEN (children) ──
                  Lives OUTSIDE face-top so it is always rendered.
                  In flat mode: CSS positions it on the same Z-plane as face-top.
                  In upright mode: fills the full device-frame normally.
                */}
                <div className={cn('screen', className)}>
                    {children}
                </div>
            </div>
        </div>
    );
};
