import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, ArrowRight, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../config/communities";

interface LoginFormProps {
    onSuccess?: () => void;
    onSwitchToRegister?: () => void;
    hideBackNav?: boolean;
    disablePrefill?: boolean;
}

export const LoginForm = ({ onSuccess, onSwitchToRegister, hideBackNav = false, disablePrefill = false }: LoginFormProps) => {
    const navigate = useNavigate();
    const { user, setAuth } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false);
    // Default to stored instance or Default Community
    const [instance, setInstance] = useState(
        localStorage.getItem('active_community_url') || DEFAULT_COMMUNITY.url
    );
    const [email, setEmail] = useState("");

    // Pre-fill from store
    useState(() => {
        if (user && !disablePrefill) {
            if (user.email) setEmail(user.email);
            // instance handled by initial state
        }
    });

    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for 2FA
    const [step, setStep] = useState(1); // 1: Login, 2: OTP
    const [otp, setOtp] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Ensure API client points to the correct instance
        if (instance) {
            localStorage.setItem('active_community_url', instance);
            const match = COMMUNITIES.find(c => c.url === instance || c.url === `http://${instance}`);
            if (match) {
                localStorage.setItem('active_community_id', match.id);
            }
        }

        try {
            if (step === 1) {
                const response = await authApi.login({ email, password });
                if (response.token) {
                    setAuth(response.user, response.token);
                    toast.success("Welcome back!");
                    onSuccess ? onSuccess() : navigate("/dashboard");
                    return;
                }
                setStep(2);
                toast.success(`Verification code sent to ${email}. Check your inbox.`);
            } else {
                const response = await authApi.verifyOTP({ email, code: otp });
                setAuth(response.user, response.token);
                toast.success("Welcome back!");
                onSuccess ? onSuccess() : navigate("/dashboard");
            }
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Login failed. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-center">
            {/* Back Button */}
            {!hideBackNav && (
                <div className="absolute top-4 left-4 md:top-8 md:left-8 z-[10]">
                    <Button
                        variant="ghost"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>
            )}

            <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center p-6">
                {/* Left Column: Heading & Info */}
                <div className="text-left space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Globe className="w-8 h-8 text-primary" />
                    </div>

                    <div>
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            {step === 1 ? "Welcome back" : "Verify It's You"}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {step === 1 ? "Sign in to your Nexus account to connect with your community." : `We've sent a 6-digit code to ${email}. Please enter it below.`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                        <Shield className="w-4 h-4" />
                        <span>Your credentials are encrypted end-to-end</span>
                    </div>
                </div>

                {/* Right Column: Form */}
                <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6 shadow-xl border border-white/10 relative">
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="instance">Instance</Label>
                                <Select value={instance} onValueChange={setInstance}>
                                    <SelectTrigger className="h-11 bg-secondary border-border">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Select community" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMMUNITIES.map((community) => (
                                            <SelectItem key={community.id} value={community.url}>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-medium">{community.name}</span>
                                                    <span className="text-xs text-muted-foreground">{community.url.replace('http://', '')}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Select the community instance your account belongs to
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 bg-secondary border-border"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 bg-secondary border-border pr-10"
                                        required
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
                    ) : (
                        <div className="space-y-4">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="h-14 bg-secondary border-border text-center text-2xl tracking-[0.5em] font-mono"
                                maxLength={6}
                                required
                                autoFocus
                            />
                            <div className="text-center">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="text-sm text-muted-foreground"
                                    onClick={() => setStep(1)}
                                >
                                    Use a different email
                                </Button>
                            </div>
                        </div>
                    )}

                    <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={isLoading}>
                        {isLoading ? "Processing..." : (
                            <>
                                {step === 1 ? "Sign In" : "Verify Code"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>

                    {step === 1 && (
                        <>
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">New to Nexus?</span>
                                </div>
                            </div>

                            {onSwitchToRegister ? (
                                <Button
                                    variant="outline"
                                    className="w-full h-11"
                                    onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}
                                >
                                    Create an Account
                                </Button>
                            ) : (
                                <Link to="/register">
                                    <Button variant="outline" className="w-full h-11">
                                        Create an Account
                                    </Button>
                                </Link>
                            )}
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
