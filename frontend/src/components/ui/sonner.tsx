import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-sm group-[.toaster]:border-2",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-semibold group-[.toast]:px-4 group-[.toast]:hover:bg-primary/90 group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:font-semibold group-[.toast]:px-4 group-[.toast]:hover:bg-muted/80 group-[.toast]:transition-colors",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:hover:bg-muted group-[.toast]:transition-colors",
          success:
            "group-[.toaster]:bg-emerald-500/10 group-[.toaster]:border-emerald-500/30 group-[.toaster]:text-emerald-600 dark:group-[.toaster]:text-emerald-400",
          error:
            "group-[.toaster]:bg-red-500/10 group-[.toaster]:border-red-500/30 group-[.toaster]:text-red-600 dark:group-[.toaster]:text-red-400",
          warning:
            "group-[.toaster]:bg-amber-500/10 group-[.toaster]:border-amber-500/30 group-[.toaster]:text-amber-600 dark:group-[.toaster]:text-amber-400",
          info:
            "group-[.toaster]:bg-blue-500/10 group-[.toaster]:border-blue-500/30 group-[.toaster]:text-blue-600 dark:group-[.toaster]:text-blue-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
