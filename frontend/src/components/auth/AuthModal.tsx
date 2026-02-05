import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
    const [view, setView] = useState<'login' | 'register'>('login');

    // Reset view when modal closes/opens
    useEffect(() => {
        if (open) {
            setView('login');
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-[85vw] w-full h-[90vh] md:h-[85vh] p-0 overflow-hidden bg-background border-border [&>button]:top-4 [&>button]:right-4 [&>button]:opacity-100 [&>button]:ring-2 [&>button]:ring-primary [&>button]:text-primary [&>button]:bg-transparent [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center">
                {/* Hidden Header for Accessibility */}
                <DialogHeader className="sr-only">
                    <DialogTitle>Authentication</DialogTitle>
                    <DialogDescription>
                        {view === 'login' ? "Sign in to your account" : "Create a new account"}
                    </DialogDescription>
                </DialogHeader>

                <div className="w-full h-full overflow-y-auto">
                    {view === 'login' ? (
                        <LoginForm
                            onSuccess={() => {
                                // Close modal on successful login/switch
                                onOpenChange(false);
                                // The auth store listeners will handle the navigation/dashboard refresh if needed
                                // But typically we are already ON the dashboard if we opened this.
                                // Actually we might be anywhere.
                                // If we are on dashboard, switching account automatically updates the view via store subscription.
                                window.location.reload(); // Force reload to ensure clean state with new account
                            }}
                            onSwitchToRegister={() => setView('register')}
                            hideBackNav={true}
                            disablePrefill={true}
                        />
                    ) : (
                        <RegisterForm
                            onSuccess={() => setView('login')}
                            onSwitchToLogin={() => setView('login')}
                            hideBackNav={true}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
