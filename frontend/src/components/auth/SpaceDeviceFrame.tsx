import React from 'react';
import { cn } from '@/lib/utils';
import './SpaceDevice.css';

interface SpaceDeviceFrameProps {
    children: React.ReactNode;
    className?: string;
    wrapperClassName?: string;
    isFlat?: boolean;
    isHorizontal?: boolean;
}

export const SpaceDeviceFrame = ({ children, className, wrapperClassName, isFlat, isHorizontal }: SpaceDeviceFrameProps) => {
    return (
        <div className={cn("device-wrapper", wrapperClassName)}>
            <div className={cn("device-frame", isFlat && "flat-mode", isHorizontal && "horizontal-mode")}>
                {/* Hardware Details */}
                <div className="antenna" />

                <div className="corner tl" />
                <div className="corner tr" />
                <div className="corner bl" />
                <div className="corner br" />

                <div className="side-module left" />
                <div className="side-module right" />

                {/* Inner Screen Panel */}
                <div className={cn("screen relative bg-black/80 backdrop-blur-md shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] border border-white/5 overflow-y-auto custom-scrollbar", className)}>
                    {children}
                </div>
            </div>
        </div>
    );
};
