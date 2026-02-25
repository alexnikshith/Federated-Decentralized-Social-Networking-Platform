"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX, IconChevronDown } from "@tabler/icons-react";

export interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  subLinks?: { label: string; href: string }[];
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar className={className} {...props}>
        {children}
      </DesktopSidebar>
      <MobileSidebar className={className}>{children as React.ReactNode}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-screen hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[240px] shrink-0 fixed left-0 top-0 z-40 overflow-hidden",
          className
        )}
        animate={{
          width: animate ? (open ? "240px" : "60px") : "240px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div >
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<typeof motion.div>, 'children' | 'className'>) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden  items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLinkGroup = ({
  link,
  className,
  isActive,
  onMainClick,
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
  onMainClick?: () => void;
}) => {
  const { open, animate } = useSidebar();
  // Keep dropdowns open by default as requested
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center justify-between group/sidebar py-2 cursor-pointer w-full transition-all duration-200",
          open ? "px-4" : "justify-center px-0",
          isActive && !isOpen && "bg-orange-500/10 dark:bg-orange-500/20",
          "hover:bg-neutral-200 dark:hover:bg-neutral-800/50",
          className
        )}
        onClick={() => {
          if (open) {
            setIsOpen(!isOpen);
          } else {
            onMainClick?.();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1 rounded-md transition-colors",
            isActive ? "text-orange-500" : "text-neutral-700 dark:text-neutral-200"
          )}>
            {link.icon}
          </div>
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className={cn(
              "text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre",
              isActive && "font-semibold text-orange-500"
            )}
          >
            {link.label}
          </motion.span>
        </div>
        {open && link.subLinks && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <IconChevronDown className="h-4 w-4 text-neutral-500" />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {open && isOpen && link.subLinks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-1 ml-6 mt-1 border-l border-neutral-200 dark:border-neutral-700/50 pl-4 overflow-hidden"
          >
            {link.subLinks.map((sub, idx) => {
              const isSubActive = window.location.search.includes(sub.href.split('?')[1] || '---never---');
              return (
                <a
                  key={idx}
                  href={sub.href}
                  className={cn(
                    "text-[13px] py-1.5 px-3 text-neutral-600 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/5 dark:hover:bg-orange-500/10 rounded-md transition-all relative group/sublink",
                    isSubActive && "text-orange-500 dark:text-orange-400 font-medium bg-orange-500/10 dark:bg-orange-500/20"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    (window as any).navigationHandler?.(sub.href);
                  }}
                >
                  {isSubActive && (
                    <motion.div
                      layoutId="sublink-indicator"
                      className="absolute left-[-17px] top-1/2 -translate-y-1/2 w-[2px] h-4 bg-orange-500 rounded-full"
                    />
                  )}
                  {sub.label}
                </a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const { open, animate } = useSidebar();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer w-full hover:bg-neutral-200 dark:hover:bg-neutral-700/50 rounded-md transition-all duration-200",
        open ? "px-4" : "justify-center px-0",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  );
};
