import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Globe, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import type { User } from "../../../epics/identity/types";

interface JoinCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetCommunity: { id: string; name: string; url: string } | null;
    currentUserEmail: string;
    onSuccess: () => void;
    initialStep?: 'register' | 'login';
}

export const JoinCommunityModal = ({
    isOpen,
    onClose,
    targetCommunity,
    currentUserEmail,
    onSuccess,
    initialStep = 'register'
}: JoinCommunityModalProps) => {
    const [step, setStep] = useState<'register' | 'login' | 'otp'>(initialStep);
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [emailInput, setEmailInput] = useState(currentUserEmail);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const setAuth = useAuthStore((state) => state.setAuth);
    const [otp, setOtp] = useState("");

    // Username validation states
    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    // Sync prop to state if it loads late
    useEffect(() => {
        if (currentUserEmail) setEmailInput(currentUserEmail);
    }, [currentUserEmail]);

    // Create a temporary API client for the target server
    const api = useMemo(() => axios.create({
        baseURL: targetCommunity?.url || '',
        headers: {
            'Content-Type': 'application/json'
        }
    }), [targetCommunity?.url]);

    const activeEmail = currentUserEmail || emailInput;
    const isPreFilled = !!currentUserEmail;

    // Real-time username check with debounce
    useEffect(() => {
        if (!username) {
            setUsernameError('');
            setUsernameAvailable(null);
            return;
        }

        if (username.includes(' ')) {
            setUsernameError('Username cannot contain spaces');
            setUsernameAvailable(null);
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError('Only letters, numbers and underscores allowed');
            setUsernameAvailable(null);
            return;
        }

        setUsernameError('');
        const timer = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                // Check against the target community's API
                const response = await api.post('/api/auth/check-username', { username });
                const taken = response.data.exists;
                setUsernameAvailable(!taken);
                if (taken) {
                    setUsernameError('This username is already taken');
                }
            } catch (err) {
                console.error('Failed to check username', err);
                // Fallback: assume available if check fails to avoid blocking, or show warning
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, api]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (usernameError || usernameAvailable === false) return;

        setIsLoading(true);

        try {
            const response = await api.post('/api/auth/signup', {
                username,
                display_name: displayName,
                email: activeEmail,
                password,
                instance: targetCommunity.url
            });

            // Handle standard response wrapper
            const data = response.data.data || response.data;

            if (data && data.token) {
                finalizeJoin(data.user, data.token);
            } else {
                toast.success("Account created! Please log in.");
                setStep('login');
            }

        } catch (error: any) {
            const msg = error.response?.data?.message || "Registration failed.";
            if (msg.includes("already exists") || msg.includes("registered")) {
                toast.info("Account exists with this email. Please log in.");
                setStep('login');
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };


    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post('/api/auth/verify-otp', {
                email: activeEmail,
                code: otp
            });

            const data = response.data.data || response.data;
            if (data && data.token) {
                finalizeJoin(data.user, data.token);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post('/api/auth/login', {
                email: activeEmail,
                password
            });

            const data = response.data.data || response.data;
            if (data && data.token) {
                finalizeJoin(data.user, data.token);
            } else {
                toast.success("Verification code sent to your email.");
                setStep('otp');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const finalizeJoin = async (newUser: User, newToken: string) => {
        try {
            // Bi-Directional Sync: Ensure both communities know about each other
            const currentToken = useAuthStore.getState().token;
            const currentUrl = localStorage.getItem('active_community_url');
            const currentId = localStorage.getItem('active_community_id');

            // 1. Sync NEW community ID to OLD community (if logged in previously)
            if (currentToken && currentUrl && currentUrl !== targetCommunity.url) {
                // Fire and forget sync to old community
                axios.post(`${currentUrl}/api/profile/me/communities`,
                    { community_id: targetCommunity.id },
                    { headers: { Authorization: `Bearer ${currentToken}` } }
                ).catch(err => console.error("Background sync to old community failed", err));
            }

            // 2. Sync OLD community ID to NEW community (so the new profile includes previous history)
            if (currentId && currentId !== targetCommunity.id) {
                try {
                    console.log(`Syncing current community ${currentId} to new profile on ${targetCommunity.name}`);
                    await axios.post(`${targetCommunity.url}/api/profile/me/communities`,
                        { community_id: currentId },
                        { headers: { Authorization: `Bearer ${newToken}` } }
                    );
                    toast.success(`Successfully linked ${currentId} to your ${targetCommunity.name} account.`);

                    // Update the local user object to reflect this change immediately
                    // This ensures the "Join Now" button for the old community disappears immediately
                    if (!newUser.joined_communities) newUser.joined_communities = [];
                    if (!newUser.joined_communities.includes(currentId)) {
                        newUser.joined_communities.push(currentId);
                    }
                } catch (err) {
                    console.error("Background sync to new community failed", err);
                    toast.error(`Failed to link ${currentId} to new account. You may need to join it manually.`);
                }
            }

            localStorage.setItem('active_community_id', targetCommunity.id);
            localStorage.setItem('active_community_url', targetCommunity.url);

            // Use the potentially updated 'newUser' object
            // Ensure we create a new object reference to trigger Store updates if needed
            setAuth({ ...newUser }, newToken);

            onSuccess();
        } catch (e) {
            console.error("Failed to finalize join", e);
            toast.error("Failed to save session.");
        }
    };

    if (!targetCommunity) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <DialogTitle>Join {targetCommunity.name}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {step === 'register'
                            ? `Create your identity on ${targetCommunity.name}.`
                            : `Sign in to your account on ${targetCommunity.name}.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={step === 'register' ? handleRegister : (step === 'login' ? handleLogin : handleVerifyOtp)} className="space-y-4 py-2">
                    {step === 'otp' ? (
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit code"
                                required
                                className="text-center text-lg tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                                Check your email ({activeEmail}) for the code.
                            </p>
                        </div>
                    ) : (
                        <>
                            {step === 'register' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="display_name">Display Name</Label>
                                        <Input
                                            id="display_name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="username">Username</Label>
                                            {isCheckingUsername && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                        </div>
                                        <div className="relative">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 z-10">@</span>
                                                <Input
                                                    id="username"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                                    placeholder="username"
                                                    className={`pl-8 ${usernameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                    required
                                                />
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {usernameAvailable === true && !usernameError && <Check className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                        </div>
                                        {usernameError && (
                                            <p className="text-[10px] font-bold text-destructive animate-in fade-in slide-in-from-top-1 ml-1">{usernameError}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={activeEmail || ""}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    disabled={isPreFilled}
                                    className={`h-11 border-order text-foreground bg-background ${isPreFilled ? "opacity-100 font-medium bg-secondary/20" : ""}`}
                                    required
                                />
                                {isPreFilled && (
                                    <p className="text-[10px] text-muted-foreground">
                                        Using your primary email for consistency across federation.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={step === 'register' ? "Create password" : "Enter password"}
                                        required
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-2">
                        <Button type="submit" className="w-full" disabled={isLoading || (step === 'register' && (!!usernameError || usernameAvailable === false))}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {step === 'register' ? 'Create Account' : (step === 'login' ? 'Sign In' : 'Verify')}
                        </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        {step === 'register' ? (
                            <p>Already have an account here? <button type="button" onClick={() => setStep('login')} className="text-primary hover:underline">Sign in</button></p>
                        ) : step === 'login' ? (
                            <p>Need an account? <button type="button" onClick={() => setStep('register')} className="text-primary hover:underline">Register</button></p>
                        ) : (
                            <p><button type="button" onClick={() => setStep('login')} className="text-primary hover:underline">Back to Login</button></p>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
