
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
    IconHome,
    IconRss,
    IconSearch,
    IconUser,
    IconSettings,
    IconMoon,
    IconSun,
    IconLogout,
    IconUsers,
    IconWorld,
    IconX,
    IconLayoutList,
    IconChartBar,
    IconBell
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { useContentStore } from "../../../epics/content-sharing/store/contentStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { FloatingDock } from "../ui/floating-dock";
import { Home } from "lucide-react";
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
import { LogOut, User as LucideUser } from "lucide-react";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, clearAuth } = useAuthStore();
    const { unreadCount } = useContentStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // If on landing page, don't show navigation
    if (location.pathname === "/") {
        return <>{children}</>;
    }

    const handleLogout = () => {
        clearAuth();
        navigate("/");
    };

    // Sidebar Links: Communities, Explore Federation
    // Settings, Theme, Logout are in bottom section manually
    const sidebarLinks = [
        {
            label: "Communities",
            href: "/communities",
            icon: (
                <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Explore Federation",
            href: "/explore",
            icon: (
                <IconWorld className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Reports",
            href: "/reports",
            icon: (
                <IconChartBar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
    ];

    const settingsLink = {
        label: "Settings",
        href: "/settings",
        icon: (
            <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
        ),
    };

    // Floating Dock Links: Home, Feed, Search, Profile
    const dockLinks = [
        {
            title: "Home",
            icon: (
                <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/dashboard",
        },
        {
            title: "Post",
            icon: (
                <IconLayoutList className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "/feed",
        },
        {
            title: "Search",
            icon: (
                <IconSearch className="h-full w-full text-neutral-500 dark:text-neutral-300" />
            ),
            href: "#",
            onClick: () => setShowSearch(true),
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
        },
    ];

    return (
        <div className="flex w-full min-h-screen bg-background">
            <Sidebar open={open || isDropdownOpen} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                        {(open || isDropdownOpen) ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {sidebarLinks.map((link, idx) => (
                                <SidebarLink
                                    key={idx}
                                    link={link}
                                    className={location.pathname === link.href ? "bg-neutral-200 dark:bg-neutral-700 rounded-md" : ""}
                                    onClick={() => navigate(link.href)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <SidebarLink
                            link={settingsLink}
                            onClick={() => navigate("/settings")}
                            className={location.pathname === "/settings" ? "bg-neutral-200 dark:bg-neutral-700 rounded-md" : ""}
                        />
                        <SidebarLink
                            link={{
                                label: theme === "dark" ? "Dark" : "Light",
                                href: "#",
                                icon: theme === "dark" ? (
                                    <IconMoon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
                                ) : (
                                    <IconSun className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
                                ),
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                toggleTheme();
                            }}
                        />

                        <DropdownMenu onOpenChange={setIsDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer w-full text-left outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors px-1"
                                    onMouseEnter={() => setOpen(true)}
                                >
                                    <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={user?.avatar_url} alt={user?.username} />
                                        <AvatarFallback className="text-[10px] bg-neutral-200 dark:bg-neutral-700">
                                            {user?.username?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <motion.span
                                        animate={{
                                            display: (open || isDropdownOpen) ? "inline-block" : "none",
                                            opacity: (open || isDropdownOpen) ? 1 : 0,
                                        }}
                                        className="text-neutral-700 dark:text-neutral-200 text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block truncate"
                                    >
                                        {user?.username}
                                    </motion.span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mb-2 z-[100]" side="top" align="center" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/profile/${user?.username}`)} className="cursor-pointer">
                                    <LucideUser className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </SidebarBody>
            </Sidebar>

            <div className={cn(
                "flex-1 min-h-screen transition-all duration-300 pb-32 relative",
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
                                    <UserSearch />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* macOS Style Full Width Footer Dock */}
                <div className="fixed bottom-0 left-0 w-full z-50 bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-t border-neutral-200 dark:border-neutral-800 py-1 flex justify-center items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <FloatingDock
                        items={dockLinks}
                        desktopClassName="bg-transparent border-none shadow-none"
                    />
                </div>
            </div>
        </div>
    );
};

export const Logo = () => {
    return (
        <a
            href="/"
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
        >
            <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium whitespace-pre text-black dark:text-white"
            >
                Nexus Social
            </motion.span>
        </a>
    );
};

export const LogoIcon = () => {
    return (
        <a
            href="/"
            className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
        >
            <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
        </a>
    );
};
