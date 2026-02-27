import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { SignupRequest } from '../types';
import { COMMUNITIES } from '../../../src/config/communities';
import { Users, Globe, ArrowRight, Check, AlertCircle, Loader2, ChevronLeft, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";


// SignupPage handles new user registration
export const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedCommunityId, setSelectedCommunityId] = useState<string>(COMMUNITIES[0].id);

    const [formData, setFormData] = useState<SignupRequest>({
        username: '',
        email: '',
        password: '',
        display_name: '',
        is_discoverable: true,
        avatar_url: '/avatars/avatar_1.png',
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Avatar upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Username validation states
    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    // Handle community selection transition
    const handleNextStep = () => {
        const comm = COMMUNITIES.find(c => c.id === selectedCommunityId);
        if (comm) {
            localStorage.setItem('active_community_url', comm.url);
            localStorage.setItem('active_community_id', comm.id);
            const existing = JSON.parse(localStorage.getItem('joined_community_ids') || '[]');
            if (!existing.includes(comm.id)) {
                existing.push(comm.id);
            }
            localStorage.setItem('joined_community_ids', JSON.stringify(existing));
            setStep(2);
        }
    };

    // Real-time username check with debounce
    useEffect(() => {
        if (!formData.username) {
            setUsernameError('');
            setUsernameAvailable(null);
            return;
        }

        if (formData.username.includes(' ')) {
            setUsernameError('Username cannot contain spaces');
            setUsernameAvailable(null);
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setUsernameError('Only letters, numbers and underscores allowed');
            setUsernameAvailable(null);
            return;
        }

        setUsernameError('');
        const timer = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const taken = await authApi.checkUsername(formData.username);
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
    }, [formData.username]);

    // Handle custom avatar upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);
        setError('');

        try {
            const { url } = await authApi.uploadAvatar(file);
            setFormData(prev => ({ ...prev, avatar_url: url }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (usernameError || usernameAvailable === false) return;

        if (formData.password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        // Move to step 3 instead of submitting
        if (step === 2) {
            setStep(3);
            return;
        }

        setLoading(true);

        try {
            await authApi.signup(formData);
            // After successful signup, redirect to login
            // We don't auto-login here because 2FA might be enabled or regular validation might be needed
            navigate('/login', { state: { email: formData.email, signupSuccess: true } });
        } catch (error) {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setError(errorMessage || 'Signup failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative w-full items-center justify-center p-4">
            {/* Global Cosmos Background */}
            <div
                className="fixed inset-0 w-full h-full bg-[url('/cosmos-bg.png')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen pointer-events-none"
                style={{ filter: "contrast(1.2) brightness(0.8)", zIndex: 0 }}
            />
            {/* Global darkening overlay to ensure text readability */}
            <div className="fixed inset-0 bg-background/60 pointer-events-none" style={{ zIndex: 0 }} />

            <div className={cn(
                "relative z-10 w-full transition-all duration-700 ease-in-out flex flex-col md:flex-row gap-8 items-stretch",
                step === 1 ? "max-w-xl" : "max-w-5xl"
            )}>
                {/* Left Side - Info / Selection */}
                <div className={cn(
                    "flex-1 flex flex-col justify-center space-y-6 transition-all duration-500",
                    step === 2 ? "md:max-w-sm" : ""
                )}>
                    <div className="space-y-2">
                        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to home
                        </Link>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                            <Globe className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
                            Join the <span className="text-primary italic">Federation</span>
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Create your account on a community instance that fits you.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80">
                                {step === 1 ? 'Choose your community' : 'Selected Community'}
                            </h3>
                        </div>

                        {step === 1 ? (
                            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {COMMUNITIES.map((community) => (
                                    <button
                                        key={community.id}
                                        onClick={() => setSelectedCommunityId(community.id)}
                                        className={cn(
                                            "group relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left overflow-hidden",
                                            selectedCommunityId === community.id
                                                ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20"
                                                : "bg-card border-border hover:border-primary/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                            selectedCommunityId === community.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{community.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{community.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Active</span>
                                            {selectedCommunityId === community.id && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-primary-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}

                                <button
                                    onClick={handleNextStep}
                                    className="mt-4 w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                                >
                                    Continue to Account Details
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        ) : (
                            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground text-sm">{COMMUNITIES.find(c => c.id === selectedCommunityId)?.name}</h4>
                                        <p className="text-xs text-muted-foreground">{COMMUNITIES.find(c => c.id === selectedCommunityId)?.url}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side - Form */}
                {step === 2 && (
                    <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden h-full">
                            {/* Decorative elements */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Account Details</h2>
                                    <p className="text-sm text-muted-foreground">Fill in the info below to join the community.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
                                    {error && (
                                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Display Name</label>
                                        <input
                                            type="text"
                                            value={formData.display_name}
                                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            required
                                            placeholder="John Doe"
                                            className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                                        />
                                    </div>

                                    <div className="space-y-1.5 relative">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Username</label>
                                            {isCheckingUsername && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">@</span>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                                required
                                                placeholder="your_username"
                                                className={cn(
                                                    "w-full bg-secondary/50 border rounded-2xl p-4 pl-9 text-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30",
                                                    usernameError ? "border-destructive/50 ring-destructive/10" : "border-border focus:border-primary/50 focus:ring-primary/10"
                                                )}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {usernameAvailable === true && !usernameError && <Check className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                        </div>
                                        {usernameError && (
                                            <p className="text-[10px] font-bold text-destructive animate-in fade-in slide-in-from-top-1 ml-1">{usernameError}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="you@example.com"
                                            className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Password</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                placeholder="••••••••"
                                                className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirm</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                className="w-full bg-secondary/50 border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-secondary/30 mt-2 transition-all hover:bg-secondary/50">
                                        <Checkbox
                                            id="is_discoverable"
                                            checked={formData.is_discoverable || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_discoverable: checked === true })}
                                            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary/50"
                                        />
                                        <div className="space-y-1">
                                            <label htmlFor="is_discoverable" className="text-xs font-bold text-foreground cursor-pointer uppercase tracking-widest block">
                                                Global Directory Visibility
                                            </label>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                Allow your profile to be listed in the public directory and discoverable by users from other communities.
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed mt-2">
                                        By clicking "Create Account", you agree to our <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (usernameError || usernameAvailable === false) return;
                                            if (formData.password !== confirmPassword) {
                                                setError('Passwords do not match');
                                                return;
                                            }
                                            if (formData.password.length < 8) {
                                                setError('Password must be at least 8 characters long');
                                                return;
                                            }
                                            setStep(3);
                                        }}
                                        disabled={loading || !!usernameError || usernameAvailable === false}
                                        className="w-full mt-auto bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        Continue to Avatar Selection
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
                        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-6">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-4 uppercase tracking-widest"
                                    >
                                        <ChevronLeft className="w-3 h-3" /> Back to Account Details
                                    </button>
                                    <h2 className="text-2xl font-bold text-foreground">Choose Your Avatar</h2>
                                    <p className="text-sm text-muted-foreground">Select an identity for your new account.</p>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl shadow-primary/10 relative group">
                                        <img
                                            src={formData.avatar_url}
                                            alt="Selected Avatar"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 w-full max-w-sm">
                                        {formData.avatar_url && !formData.avatar_url.startsWith('/avatars/') && (
                                            <button
                                                type="button"
                                                className="aspect-square rounded-2xl overflow-hidden transition-all duration-300 border-2 relative group border-primary scale-110 shadow-lg shadow-primary/30 z-10"
                                            >
                                                <img src={formData.avatar_url} alt="Custom Avatar" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                                                </div>
                                            </button>
                                        )}
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar_url: `/avatars/avatar_${num}.png` })}
                                                className={cn(
                                                    "aspect-square rounded-2xl overflow-hidden transition-all duration-300 border-2 relative group",
                                                    formData.avatar_url === `/avatars/avatar_${num}.png`
                                                        ? "border-primary scale-110 shadow-lg shadow-primary/30 z-10"
                                                        : "border-transparent hover:border-primary/50 hover:scale-105"
                                                )}
                                            >
                                                <img
                                                    src={`/avatars/avatar_${num}.png`}
                                                    alt={`Avatar option ${num}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                {typeof formData.avatar_url === 'string' && formData.avatar_url.includes(`avatar_${num}.png`) && (
                                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                        <Check className="w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Upload Button */}
                                    <div className="w-full max-w-sm mt-2">
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

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] mt-auto"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Joining the federation...
                                        </>
                                    ) : (
                                        <>
                                            Complete Registration
                                            <Check className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
