
import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUsers,
    IconSearch,
    IconMoon,
    IconSun,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { MessagesSquare } from "lucide-react";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const links = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: (
                <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Feed",
            href: "/feed",
            icon: (
                <MessagesSquare className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Communities",
            href: "/communities",
            icon: (
                <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Explore",
            href: "/explore",
            icon: (
                <IconSearch className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Settings",
            href: "/settings",
            icon: (
                <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
        {
            label: "Reports",
            href: "/reports",
            icon: (
                <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
            ),
        },
    ];

    const handleLogout = () => {
        clearAuth();
        navigate("/");
    };

    const logoutLink = {
        label: "Logout",
        href: "#",
        onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            handleLogout();
        },
        icon: (
            <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
        ),
    };

    // If on landing page, don't show sidebar (though App.tsx will handle routing)
    if (location.pathname === "/") {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
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
                        <SidebarLink
                            link={{
                                label: user?.display_name || user?.username || "User",
                                href: "/profile",
                                icon: (
                                    <img
                                        src={user?.avatar_url || "https://assets.aceternity.com/manu.png"}
                                        className="h-7 w-7 shrink-0 rounded-full"
                                        width={50}
                                        height={50}
                                        alt="Avatar"
                                    />
                                ),
                            }}
                            onClick={() => navigate("/profile")}
                        />
                        <SidebarLink
                            link={logoutLink}
                            onClick={handleLogout}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div
                className={cn(
                    "min-h-screen bg-background transition-all duration-300",
                    "w-full md:w-[calc(100%-60px)] md:ml-[60px]",
                    open && "md:w-[calc(100%-240px)] md:ml-[240px]"
                )}
            >
                {children}
            </div>
        </>
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
