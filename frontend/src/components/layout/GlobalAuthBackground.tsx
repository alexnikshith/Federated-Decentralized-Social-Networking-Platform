import { useLocation } from 'react-router-dom';
import PixelBackground from '@/components/ui/pixel-background';

export function GlobalAuthBackground() {
    const location = useLocation();

    // Determine colors based on route
    let colors = '#06b6d4,#8b5cf6,#d946ef,#22d3ee'; // Default (Landing): Cyan + Purple
    let isVisible = false;
    let opacity = 1;

    if (location.pathname === '/') {
        isVisible = true;
        colors = '#06b6d4,#8b5cf6,#d946ef,#22d3ee'; // Purple + Cyan
    } else if (location.pathname === '/login' || location.pathname === '/forgot-password') {
        isVisible = true;
        colors = '#10b981,#34d399,#6ee7b7'; // Emerald
    } else if (location.pathname === '/signup' || location.pathname === '/register') {
        isVisible = true;
        colors = '#f59e0b,#fbbf24,#fcd34d'; // Amber
    } else {
        // Keep it mounted but invisible on other routes so that 
        // returning to the auth flow doesn't trigger a hard re-mount if we want to preserve state,
        // actually, we can just return null and let it re-bloom on re-entry.
        // The user specifically mentioned "When the user navigates to logn or sign up page, the pixels only change colour, they dont re-bloom"
        isVisible = false;
    }

    if (!isVisible) return null;

    const hasSeenIntro = typeof window !== 'undefined' && sessionStorage.getItem("nexus_particle_intro_seen") === "true";
    const delay = (location.pathname === '/' && !hasSeenIntro) ? 3500 : 0;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-black">
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
            <div className="absolute inset-0 z-10 bg-background/10 backdrop-blur-[2px] pointer-events-none" />
        </div>
    );
}
