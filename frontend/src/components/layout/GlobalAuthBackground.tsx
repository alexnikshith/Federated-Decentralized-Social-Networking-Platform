import { useLocation } from 'react-router-dom';
import PixelBackground from '@/components/ui/pixel-background';
import { useTheme } from '@/components/theme-provider';

export function GlobalAuthBackground() {
    const location = useLocation();
    const { theme } = useTheme();

    // Determine current effective theme (handles 'system' mode)
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Determine colors based on route
    let colors = '#06b6d4,#8b5cf6,#d946ef,#22d3ee'; // Default (Landing): Cyan + Purple
    let isVisible = false;

    if (location.pathname === '/') {
        isVisible = true;
        if (isDark) {
            colors = '#06b6d4,#8b5cf6,#d946ef,#22d3ee'; // Purple + Cyan
        } else {
            colors = '#06b6d4,#94a3b8,#e2e8f0,#0891b2'; // Cyan + Slate/Grey for light mode
        }
    } else if (location.pathname === '/login' || location.pathname === '/forgot-password') {
        isVisible = true;
        colors = '#10b981,#34d399,#6ee7b7'; // Emerald
    } else if (location.pathname === '/signup' || location.pathname === '/register') {
        isVisible = true;
        colors = '#f59e0b,#fbbf24,#fcd34d'; // Amber
    } else {
        isVisible = false;
    }

    if (!isVisible) return null;

    const hasSeenIntro = typeof window !== 'undefined' && sessionStorage.getItem("nexus_particle_intro_seen") === "true";
    const delay = (location.pathname === '/' && !hasSeenIntro) ? 3500 : 0;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-amber-50 dark:bg-black">
            <PixelBackground
                direction="center"
                colors={colors}
                gap={8}
                speed={40}
                className="w-full h-full"
                canvasClassName="w-full h-full opacity-100"
                animationDelay={delay}
            />
            {/* Glassy Overlay */}
            <div className="absolute inset-0 z-10 bg-background/20 backdrop-blur-[2px] pointer-events-none" />
        </div>
    );
}
