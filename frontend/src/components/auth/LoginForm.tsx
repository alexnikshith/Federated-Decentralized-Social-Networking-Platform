import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, ArrowRight, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";

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
    const [instance, setInstance] = useState("");
    const [email, setEmail] = useState("");

    // Pre-fill from store (logic copied from LoginUI)
    useState(() => {
        if (user && !disablePrefill) {
            if (user.email) setEmail(user.email);
            if (user.instance) setInstance(user.instance);
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

        try {
            if (step === 1) {
                // Step 1: Initiate Login
                const response = await authApi.login({ email, password });

                if (response.token) {
                    setAuth(response.user, response.token);
                    toast.success("Welcome back!");
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        navigate("/dashboard");
                    }
                    return;
                }

                setStep(2);
                toast.success(`Verification code sent to ${email}. Check your inbox and spam folder.`);
            } else {
                // Step 2: Verify OTP
                const response = await authApi.verifyOTP({ email, code: otp });
                setAuth(response.user, response.token);
                toast.success("Welcome back!");
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate("/dashboard");
                }
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
            {/* Header / Back Button Logic */}
            {!hideBackNav && (
                <div className="absolute top-4 left-4 md:top-8 md:left-8">
                    <Button
                        variant="ghost"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>
            )}

            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <h1 className="font-display text-3xl font-bold mb-2">
                        {step === 1 ? "Welcome back" : "Enter Verification Code"}
                    </h1>
                    <p className="text-muted-foreground">
                        {step === 1 ? "Sign in to your Nexus account" : `We sent a code to ${email}`}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="instance">Instance</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="instance"
                                        type="text"
                                        placeholder="your-community.nexus.social"
                                        value={instance}
                                        onChange={(e) => setInstance(e.target.value)}
                                        className="pl-10 h-11 bg-secondary border-border"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Enter the domain of your community instance
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
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-primary hover:underline"
                                    >
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
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="h-11 bg-secondary border-border text-center text-lg tracking-widest"
                                maxLength={6}
                                required
                            />
                            <Button
                                type="button"
                                variant="link"
                                className="text-xs text-muted-foreground p-0 h-auto"
                                onClick={() => setStep(1)}
                            >
                                Back to login
                            </Button>
                        </div>
                    )}

                    <Button type="submit" variant="hero" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? "Processing..." : (
                            <>
                                {step === 1 ? "Sign In" : "Verify Code"}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>

                    {step === 1 && (
                        <>
                            <div className="relative">
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

                <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Your credentials are encrypted end-to-end</span>
                </div>
            </div>
        </div>
    );
};
