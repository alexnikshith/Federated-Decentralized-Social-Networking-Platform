import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, ArrowRight, Eye, EyeOff, Shield, Check, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../config/communities";

interface RegisterFormProps {
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
    hideBackNav?: boolean;
}

// Main RegisterForm component
export const RegisterForm = ({ onSuccess, onSwitchToLogin, hideBackNav = false }: RegisterFormProps) => {
    const navigate = useNavigate();

    // State for password visibility toggle
    const [showPassword, setShowPassword] = useState(false);
    const [selectedInstanceId, setSelectedInstanceId] = useState(DEFAULT_COMMUNITY.id);
    const [customInstance, setCustomInstance] = useState("");
    // Form field states
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Terms agreement state
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    // Loading state for submission
    const [isLoading, setIsLoading] = useState(false);

    const handleCommunitySelect = (community: typeof COMMUNITIES[0]) => {
        setSelectedInstanceId(community.id);
        setCustomInstance("");

        // IMMEDIATE ACTION: Set the context for the API client
        localStorage.setItem('active_community_url', community.url);
        localStorage.setItem('active_community_id', community.id);

        // Also pre-mark as joined so UX is consistent immediately
        try {
            const stored = localStorage.getItem('joined_community_ids');
            let ids = stored ? JSON.parse(stored) : [];

            // If no history, assume they are part of the default community (The Hub)
            if (ids.length === 0) {
                ids = [DEFAULT_COMMUNITY.id];
            }

            if (!ids.includes(community.id)) {
                ids.push(community.id);
                localStorage.setItem('joined_community_ids', JSON.stringify(ids));
            }
        } catch (e) {
            // Ignore storage errors
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Ensure context is set before request (redundant safety)
            const selectedComm = COMMUNITIES.find(c => c.id === selectedInstanceId);
            if (selectedComm && !customInstance) {
                localStorage.setItem('active_community_url', selectedComm.url);
            }

            await authApi.signup({
                username,
                email,
                password,
                instance: customInstance || (selectedComm?.url || "")
            });

            toast.success("Account created successfully! Please sign in.");
            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/login");
            }
        } catch (err: any) {
            // Handle registration errors
            toast.error(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const selectedComm = COMMUNITIES.find(c => c.id === selectedInstanceId);
    const currentInstanceUrl = customInstance || selectedComm?.url || "";

    return (
        <div className="w-full h-full flex flex-col justify-center">
            {/* Back navigation button (optional) */}
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

            <form onSubmit={handleSubmit} className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-16 items-start p-6">

                {/* LEFT COLUMN: Header + Community Selection */}
                <div className="space-y-8">
                    <div className="text-left space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="font-display text-4xl font-bold">Join the Federation</h1>
                        <p className="text-muted-foreground text-lg">
                            Create your account on a community instance that fits you.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-base font-medium">Choose your community</Label>
                        <div className="grid gap-3">
                            {COMMUNITIES.map((community) => (
                                <button
                                    key={community.id}
                                    type="button"
                                    onClick={() => handleCommunitySelect(community)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                        selectedInstanceId === community.id && !customInstance
                                            ? "border-primary bg-primary/10 shadow-sm"
                                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                            <Users className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">{community.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Active</span>
                                        {selectedInstanceId === community.id && !customInstance && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                            }
                        </div >

                        {/* Divider */}
                        < div className="relative py-2" >
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">or join a custom instance</span>
                            </div>
                        </div >

                        {/* Custom Instance Input */}
                        < div className="relative" >
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="custom-instance.nexus.social"
                                value={customInstance}
                                onChange={(e) => {
                                    setCustomInstance(e.target.value);
                                    setSelectedInstanceId("");
                                }}
                                className="pl-10 h-12 bg-secondary border-border"
                            />
                        </div >
                    </div >
                </div >

                {/* RIGHT COLUMN: User Details Form */}
                < div className="glass-card rounded-2xl p-8 space-y-6 shadow-xl border border-white/10 relative" >
                    <div className="space-y-4">
                        <Label className="text-base font-medium">Account Details</Label>

                        {/* Username Input */}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-lg">@</span>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="your_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-11 bg-secondary border-border flex-1"
                                />
                            </div>
                            {currentInstanceUrl && username && (
                                <p className="text-xs text-muted-foreground">
                                    Your full handle: <span className="text-primary font-medium">@{username}@{currentInstanceUrl.replace('http://', '')}</span>
                                </p>
                            )}
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 bg-secondary border-border"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 bg-secondary border-border pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Minimum 8 characters with at least one number and symbol
                            </p>
                        </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="pt-2">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="terms"
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                                className="mt-1"
                            />
                            <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                                I agree to the{" "}
                                <Link to="/terms" className="text-primary hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="text-primary hover:underline">
                                    Privacy Policy
                                </Link>
                                . I understand my data will be stored on my chosen instance.
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="hero"
                        className="w-full h-11 text-base mt-2"
                        disabled={(!selectedInstanceId && !customInstance) || !username || !email || !password || !agreedToTerms || isLoading}
                    >
                        {isLoading ? "Creating Account..." : (
                            <>
                                Create Account
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>

                    {/* Login Link */}
                    <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            {onSwitchToLogin ? (
                                <button
                                    type="button"
                                    className="text-primary hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                                    onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}
                                >
                                    Sign in
                                </button>
                            ) : (
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Sign in
                                </Link>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        <span>Your data stays on your chosen community instance</span>
                    </div>
                </div >
            </form >
        </div >
    );
};
