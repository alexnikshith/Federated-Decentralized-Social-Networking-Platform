import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, ArrowRight, Eye, EyeOff, Shield, Check, Users, ArrowLeft, Loader2, Upload } from "lucide-react";
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
    const [customInstance] = useState("");
    // Form field states
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState("/avatars/avatar_1.png");
    // Terms agreement state
    // Checkbox state for discoverability
    const [isDiscoverable, setIsDiscoverable] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    // Loading state for submission
    const [isLoading, setIsLoading] = useState(false);

    // Avatar upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Username validation states
    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    const handleCommunitySelect = (community: typeof COMMUNITIES[0]) => {
        setSelectedInstanceId(community.id);

        // IMMEDIATE ACTION: Set the context for the API client
        localStorage.setItem('active_community_url', community.url);
        localStorage.setItem('active_community_id', community.id);

        // Also pre-mark as joined so UX is consistent immediately
        try {
            const stored = localStorage.getItem('joined_community_ids');
            let ids = stored ? JSON.parse(stored) : [];

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
                const taken = await authApi.checkUsername(username);
                setUsernameAvailable(!taken);
                if (taken) {
                    setUsernameError('This username is already taken');
                }
            } catch (err) {
                console.error('Failed to check username', err);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    // Handle custom avatar upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);

        try {
            const { url } = await authApi.uploadAvatar(file);
            setSelectedAvatar(url);
            toast.success('Avatar uploaded successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (usernameError || usernameAvailable === false) return;

        setIsLoading(true);

        try {
            const selectedComm = COMMUNITIES.find(c => c.id === selectedInstanceId);
            if (selectedComm) {
                localStorage.setItem('active_community_url', selectedComm.url);
            }

            await authApi.signup({
                display_name: displayName,
                username,
                email,
                password,
                is_discoverable: isDiscoverable,
                avatar_url: selectedAvatar,
            });

            toast.success("Account created successfully! Please sign in.");
            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/login");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const selectedComm = COMMUNITIES.find(c => c.id === selectedInstanceId);
    const currentInstanceUrl = selectedComm?.url || "";

    return (
        <div className="w-full min-h-full flex flex-col justify-center py-8">
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
                                        selectedInstanceId === community.id
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
                                        {selectedInstanceId === community.id && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: User Details Form */}
                <div className="glass-card rounded-2xl p-8 space-y-6 shadow-xl border border-white/10 relative">
                    <div className="space-y-4">
                        <Label className="text-base font-medium">Account Details</Label>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name</Label>
                            <Input
                                id="display_name"
                                type="text"
                                placeholder="John Doe"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-11 bg-secondary border-border"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="username">Username</Label>
                                {isCheckingUsername && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg z-10">@</span>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="your_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                    className={cn(
                                        "h-11 pl-8 pr-10 bg-secondary flex-1 transition-all",
                                        usernameError ? "border-destructive focus-visible:ring-destructive" : "border-border"
                                    )}
                                    required
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {usernameAvailable === true && !usernameError && <Check className="w-4 h-4 text-emerald-500" />}
                                </div>
                            </div>
                            {usernameError && (
                                <p className="text-[10px] font-bold text-destructive animate-in fade-in slide-in-from-top-1 ml-1">{usernameError}</p>
                            )}
                            {currentInstanceUrl && username && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your full handle: <span className="text-primary font-medium">@{username}@{currentInstanceUrl.replace(/^https?:\/\//, '')}</span>
                                </p>
                            )}
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
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
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
                            <p className="text-xs text-muted-foreground">
                                Minimum 8 characters with at least one number and symbol
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 space-y-4">
                        <Label className="text-base font-medium">Choose Your Avatar</Label>
                        <div className="grid grid-cols-4 gap-3 bg-secondary/10 p-4 rounded-xl border border-border/50">
                            {selectedAvatar && !selectedAvatar.startsWith('/avatars/') && (
                                <button
                                    type="button"
                                    className="aspect-square rounded-xl overflow-hidden transition-all duration-300 border-2 relative group border-primary scale-110 shadow-lg shadow-primary/30 z-10"
                                >
                                    <img src={selectedAvatar} alt="Custom Avatar" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white drop-shadow-md" />
                                    </div>
                                </button>
                            )}
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setSelectedAvatar(`/avatars/avatar_${num}.png`)}
                                    className={cn(
                                        "aspect-square rounded-xl overflow-hidden transition-all duration-300 border-2 relative group",
                                        selectedAvatar === `/avatars/avatar_${num}.png`
                                            ? "border-primary scale-110 shadow-lg shadow-primary/30 z-10"
                                            : "border-transparent hover:border-primary/50 hover:scale-105"
                                    )}
                                >
                                    <img
                                        src={`/avatars/avatar_${num}.png`}
                                        alt={`Avatar option ${num}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {selectedAvatar === `/avatars/avatar_${num}.png` && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Custom Upload Button */}
                        <div className="w-full mt-2">
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {uploadingAvatar ? 'Uploading...' : 'Upload Custom Image'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
                            <Checkbox
                                id="is_discoverable"
                                checked={isDiscoverable}
                                onCheckedChange={(checked) => setIsDiscoverable(checked === true)}
                                className="mt-1"
                            />
                            <div className="space-y-1">
                                <label htmlFor="is_discoverable" className="text-sm font-medium text-foreground cursor-pointer">
                                    Global Directory Visibility
                                </label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Allow your profile to be listed in the public directory and discoverable by users from other communities.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="terms"
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                                className="mt-1"
                                required
                            />
                            <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                                I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                            </label>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="hero"
                        className="w-full h-11 text-base mt-2"
                        disabled={!selectedInstanceId || !username || !email || !password || !agreedToTerms || isLoading || !!usernameError || usernameAvailable === false}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>

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
                </div>
            </form>
        </div>
    );
};
