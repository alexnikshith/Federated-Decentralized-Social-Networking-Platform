
import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink, SidebarLinkGroup, Links } from "../ui/sidebar";
import { useMessagingStore } from "../../../epics/messaging/store/messagingStore";
import {
    IconSearch,
    IconSettings,
    IconMoon,
    IconSun,
    IconUsers,
    IconWorld,
    IconX,
    IconChartBar,
    IconBell,
    IconShieldLock,
    IconDeviceLaptop
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { useContentStore } from "../../../epics/content-sharing/store/contentStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { FloatingDock } from "../ui/floating-dock";
import { Home, MessageSquare } from "lucide-react";
import { UserSearch } from "../../../epics/content-sharing/components/UserSearch";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User as LucideUser, Plus } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { CommunitySwitcher } from "../CommunitySwitcher";
import { COMMUNITIES } from "../../config/communities";
import { JoinCommunityModal } from "@/components/auth/JoinCommunityModal";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, clearAuth, sessions, switchAccount, pauseSession, clearAllSessions } = useAuthStore();
    const { unreadCount = 0 } = useContentStore();
    const { unreadMessageCount, refreshUnreadCount } = useMessagingStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [targetCommunity, setTargetCommunity] = useState<typeof COMMUNITIES[0] | null>(null);

    // Refresh unread count on mount and periodically
    useEffect(() => {
        if (user) {
            refreshUnreadCount();
            // Refresh every 30 seconds
            const interval = setInterval(refreshUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user, refreshUnreadCount]);

    // Expose navigation handler for SidebarLinkGroup sublinks
    useEffect(() => {
        (window as any).navigationHandler = (href: string) => {
            navigate(href);
        };
        return () => {
            delete (window as any).navigationHandler;
        };
    }, [navigate]);

    const activeCommunityId = localStorage.getItem('active_community_id');

    const displaySessions = React.useMemo(() => {
        if (!user) return [];

        // Return all sessions except the current active one
        // We match based on User ID AND Community ID to ensure we don't hide
        // the same user in a different community, or different users in the same community.
        return sessions.filter(s => {
            const isCurrentSession = s.user?.id === user.id && s.communityId === activeCommunityId;
            return !isCurrentSession;
        });
    }, [sessions, user, activeCommunityId]);

    // If on landing page or about page, don't show navigation
    if (location.pathname === "/" || location.pathname === "/about") {
        return <>{children}</>;
    }

    const handleLogout = () => {
        clearAuth();
    };

    const handleOpenJoinModal = (community: typeof COMMUNITIES[0]) => {
        setTargetCommunity(community);
        setShowJoinModal(true);
    };

    const handleJoinSuccess = () => {
        setShowJoinModal(false);
        navigate('/dashboard');
    };


    // Sidebar Links: Communities, Reports
    // Settings, Theme, Logout are in bottom section manually
    const sidebarLinks: Links[] = [
        {
            label: "Federation",
            href: "/communities",
            icon: (
                <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        // Moved Explore to Dock for better access
        {
            label: "Reports",
            href: "/reports",
            icon: (
                <IconChartBar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
            subLinks: [
                { label: "Time Usage", href: "/reports?tab=time-usage" },
                { label: "Interactions", href: "/reports?tab=interactions" },
                { label: "Posts", href: "/reports?tab=posts" },
            ]
        },
        ...(user?.role === "admin" ? [
            {
                label: "Admin Panel",
                href: "/admin",
                icon: (
                    <IconShieldLock className="h-5 w-5 shrink-0 text-primary" />
                ),
                subLinks: [
                    { label: "Stats Overview", href: "/admin?tab=overview" },
                    { label: "User Management", href: "/admin?tab=users" },
                    { label: "Moderation", href: "/admin?tab=moderation" },
                ]
            },
        ] : []),
    ];

    const settingsLink = {
        label: "Settings",
        href: "/settings",
        icon: (
            <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
        ),
    };

    // Floating Dock Links: Home, Search, Explore, Create, Notifications, Messages, Profile
    const dockLinks = [
        {
            title: "Home",
            icon: (
                <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/dashboard",
            active: location.pathname === "/dashboard" || location.pathname === "/",
        },
        {
            title: "Search",
            icon: (
                <IconSearch className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "#",
            onClick: () => setShowSearch(true),
            active: showSearch,
        },
        {
            title: "Explore",
            icon: (
                <IconWorld className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/explore",
            active: location.pathname === "/explore",
        },
        {
            title: "Create",
            icon: (
                <Plus className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/feed",
            active: location.pathname === "/feed",
        },
        {
            title: "Notifications",
            icon: (
                <div className="relative h-full w-full">
                    <IconBell className="h-full w-full text-neutral-500 dark:text-neutral-300" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
                    )}
                </div>
            ),
            href: "/notifications",
            active: location.pathname === "/notifications",
        },
        {
            title: "Messages",
            icon: (
                <div className="relative h-full w-full">
                    <MessageSquare className="h-full w-full text-neutral-500 dark:text-neutral-300" />
                    {unreadMessageCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-neutral-900">
                            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                        </span>
                    )}
                </div>
            ),
            href: "/messages",
            active: location.pathname.startsWith("/messages"),
        },
        {
            title: "Profile",
            icon: (
                <LucideUser className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: user?.username ? `/profile/${user.username}` : "/dashboard",
            active: location.pathname.startsWith("/profile"),
        },
    ];

    return (
        <div className="flex w-full min-h-screen bg-background">
            <Sidebar open={open || isDropdownOpen} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto w-full">
                        <div className={cn("py-4", (open || isDropdownOpen) ? "px-6" : "px-0 flex justify-center")}>
                            {(open || isDropdownOpen) ? <Logo /> : <LogoIcon />}
                        </div>

                        {/* Community Switcher */}
                        <div className={cn("mt-4 px-4", (!open && !isDropdownOpen) && "px-0 flex justify-center")}>
                            <CommunitySwitcher
                                collapsed={!open && !isDropdownOpen}
                                onOpenJoinModal={handleOpenJoinModal}
                            />
                        </div>

                        <div className="mt-8 flex flex-col gap-2">
                            {sidebarLinks.map((link, idx) => {
                                if (link.subLinks) {
                                    return (
                                        <SidebarLinkGroup
                                            key={idx}
                                            link={link}
                                            isActive={location.pathname === link.href}
                                            onMainClick={() => navigate(link.href)}
                                        />
                                    );
                                }
                                return (
                                    <SidebarLink
                                        key={idx}
                                        link={link}
                                        className={location.pathname === link.href ? "bg-orange-500/10 dark:bg-orange-500/20 text-black dark:text-white rounded-md" : ""}
                                        onClick={() => navigate(link.href)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 px-2 pb-4">
                        {/* Profile Link Removed from Sidebar (Moved to Dock) */}
                        <SidebarLink
                            link={settingsLink}
                            onClick={() => navigate("/settings")}
                            className={location.pathname === "/settings" ? "bg-orange-500/10 dark:bg-orange-500/20 text-black dark:text-white rounded-md" : ""}
                        />
                        {/* Segmented theme toggle */}
                        <div className="px-2">
                            {(open || isDropdownOpen) ? (
                                /* Expanded: icon-only pill */
                                <div className="flex items-center justify-between rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-1 gap-0.5">
                                    {([
                                        { value: 'light', icon: <IconSun className="h-4 w-4" />, label: 'Light' },
                                        { value: 'dark', icon: <IconMoon className="h-4 w-4" />, label: 'Dark' },
                                        { value: 'system', icon: <IconDeviceLaptop className="h-4 w-4" />, label: 'System' },
                                    ] as const).map(({ value, icon, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => setTheme(value)}
                                            title={label}
                                            className={cn(
                                                "flex flex-1 items-center justify-center rounded-full py-1.5 px-3 transition-all duration-200 cursor-pointer",
                                                theme === value
                                                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm"
                                                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                            )}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* Collapsed: only the active theme icon */
                                <div className="flex justify-center">
                                    {([
                                        { value: 'light', icon: <IconSun className="h-5 w-5" />, label: 'Light' },
                                        { value: 'dark', icon: <IconMoon className="h-5 w-5" />, label: 'Dark' },
                                        { value: 'system', icon: <IconDeviceLaptop className="h-5 w-5" />, label: 'System' },
                                    ] as const).filter(({ value }) => value === theme).map(({ value, icon, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => {
                                                // Cycle through themes on click when collapsed
                                                const order = ['light', 'dark', 'system'] as const;
                                                const next = order[(order.indexOf(value) + 1) % order.length];
                                                setTheme(next);
                                            }}
                                            title={`Theme: ${label} (click to cycle)`}
                                            className="p-1.5 rounded-full transition-all duration-200 cursor-pointer text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DropdownMenu onOpenChange={setIsDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer w-full text-left outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors px-4"
                                    onMouseEnter={() => setOpen(true)}
                                >
                                    <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={user?.avatar_url} alt={user?.display_name || user?.username} />
                                        <AvatarFallback className="text-[10px] bg-neutral-200 dark:bg-neutral-700">
                                            {(user?.display_name || user?.username)?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <motion.span
                                        animate={{
                                            display: (open || isDropdownOpen) ? "inline-block" : "none",
                                            opacity: (open || isDropdownOpen) ? 1 : 0,
                                        }}
                                        className="text-neutral-700 dark:text-neutral-200 text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block truncate"
                                    >
                                        {user?.display_name || user?.username}
                                    </motion.span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60 mb-2 z-[100]" side="top" align="center" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.display_name || user?.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                                    Switch Accounts
                                </DropdownMenuLabel>
                                {displaySessions.map((session) => {
                                    const comm = COMMUNITIES.find(c => c.id === session.communityId);
                                    return (
                                        <DropdownMenuItem
                                            key={session.user.id}
                                            onClick={() => {
                                                if (session.token) {
                                                    const targetComm = COMMUNITIES.find(c => c.id === session.communityId);
                                                    // Update community context if switching across communities
                                                    if (targetComm && targetComm.id !== activeCommunityId) {
                                                        localStorage.setItem('active_community_id', targetComm.id);
                                                        localStorage.setItem('active_community_url', targetComm.url);
                                                    }

                                                    switchAccount(session.user.id, session.communityId);
                                                    navigate("/dashboard");
                                                } else {
                                                    // Just go to login for this specific account
                                                    switchAccount(session.user.id, session.communityId, true);
                                                    navigate("/login");
                                                }
                                            }}
                                            className="cursor-pointer flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={session.user.avatar_url} />
                                                    <AvatarFallback className="text-[9px]">
                                                        {(session.user.display_name || session.user.username)?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[120px] font-medium leading-tight">{session.user.display_name || session.user.username}</span>
                                                    <span className="text-[9px] text-muted-foreground">{comm?.name || "Unknown"}</span>
                                                </div>
                                            </div>
                                            {!session.token && <span className="text-[10px] text-muted-foreground uppercase">Logged out</span>}
                                        </DropdownMenuItem>
                                    )
                                })}

                                <DropdownMenuItem
                                    onClick={() => {
                                        setShowAuthModal(true);
                                    }}
                                    className="cursor-pointer text-muted-foreground mt-1"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Add an account</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out of {user?.display_name || user?.username}</span>
                                </DropdownMenuItem>
                                {sessions.filter(s => s.user.id !== user?.id).length > 0 && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            clearAllSessions();
                                            navigate("/");
                                        }}
                                        className="cursor-pointer text-red-500 focus:text-red-500"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out of all accounts</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SidebarBody>
            </Sidebar>

            <div className={cn(
                "flex-1 min-h-screen transition-all duration-300 relative",
                location.pathname !== "/messages" && "pb-28",
                // Ensure margin accounts for fixed sidebar width to prevent overlap
                "md:ml-[60px]",
                (open || isDropdownOpen) && "md:ml-[240px]"
            )}>
                {children}

                {/* Search Modal Overlay */}
                <AnimatePresence>
                    {showSearch && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
                                onClick={() => setShowSearch(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: "-40%", x: "-50%" }}
                                animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                                exit={{ opacity: 0, scale: 0.95, y: "-40%", x: "-50%" }}
                                className="fixed top-1/2 left-1/2 w-[90%] max-w-2xl h-[50vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-[80] overflow-hidden flex flex-col"
                            >
                                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold">Discover People</h2>
                                    <button
                                        onClick={() => setShowSearch(false)}
                                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                                    >
                                        <IconX className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <UserSearch onClose={() => setShowSearch(false)} />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* macOS Style Full Width Footer Dock */}
                <div className="fixed bottom-0 left-0 w-full z-30 bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-t border-neutral-200 dark:border-neutral-800 py-1 flex justify-center items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <FloatingDock
                        items={dockLinks}
                        desktopClassName="bg-transparent border-none shadow-none"
                    />
                </div>
            </div>
            {/* Auth Modal */}
            <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
            {/* Federation Join Modal */}
            <JoinCommunityModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                targetCommunity={targetCommunity}
                currentUserEmail={user?.email || ""}
                onSuccess={handleJoinSuccess}
                initialStep="login"
            />
        </div >
    );
};

export const Logo = () => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate("/dashboard")}
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black cursor-pointer"
        >
            <img src="/logo.png" alt="Nexus Social" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium whitespace-pre text-black dark:text-white"
            >
                Nexus Social
            </motion.span>
        </div>
    );
};

export const LogoIcon = () => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate("/dashboard")}
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black cursor-pointer"
        >
            <img src="/logo.png" alt="Nexus Social" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
        </div>
    );
};
