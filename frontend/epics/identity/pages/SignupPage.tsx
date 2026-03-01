import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { SignupRequest } from '../types';
import { COMMUNITIES } from '../../../src/config/communities';
import { Users, Globe, ArrowRight, Check, AlertCircle, Loader2, ChevronLeft, Upload, Orbit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpaceDeviceFrame } from '../../../src/components/auth/SpaceDeviceFrame';
import { HologramProjector } from '../../../src/components/auth/HologramProjector';
import { Checkbox } from "@/components/ui/checkbox";

// ── Fixed design dimensions for the lockstep group ──
const DESIGN_W = 700;  // px (increased for wider panel bleed)
const DESIGN_H = 500;  // px (increased for margin/spacing)

// Scales the group container to always fill the viewport as one unit.
function useScaleToFit() {
    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
        const update = () => {
            const s = Math.min(
                window.innerWidth / DESIGN_W,
                window.innerHeight / DESIGN_H
            );
            setScale(Math.min(s, 1)); // never scale up beyond 1
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return scale;
}

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

    // Hologram entrance animation — starts hidden, rises up after device appears
    const [hologramVisible, setHologramVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setHologramVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

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

    // Scale factor so the entire group shrinks/grows as one unit
    const groupScale = useScaleToFit();

    return (
        <div className="h-[100dvh] bg-background flex items-center justify-center relative w-full overflow-hidden">
            {/* Space Shuttle Background */}
            <div
                className="fixed inset-0 w-full h-full bg-[url('/Space_shuttle.png')] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen pointer-events-none"
                style={{ filter: "contrast(1.2) brightness(0.8)", zIndex: 0 }}
            />
            {/* Darkening overlay */}
            <div className="fixed inset-0 bg-background/60 pointer-events-none" style={{ zIndex: 0 }} />

            {/*
              ── LOCKED GROUP ──
              A single DESIGN_W × DESIGN_H box.  All three elements live
              inside it at fixed pixel co-ordinates. The whole box is then
              scaled-down uniformly by groupScale so nothing drifts apart.
            */}
            <div
                className="relative z-10 flex-shrink-0"
                style={{
                    width: DESIGN_W,
                    height: DESIGN_H,
                    transform: `scale(${groupScale})`,
                    transformOrigin: 'center center',
                }}
            >
                {/*
                  HologramProjector stays visible for all 3 steps.
                  Inside: an overflow-hidden slider with 3 panels side by side.
                  translateX(0)   → step 1
                  translateX(-33.333%) → step 2
                  translateX(-66.666%) → step 3
                */}
                {/* HologramProjector pinned to the top of the group */}
                <div className="absolute top-0 left-0 right-0">
                    <HologramProjector isActive={hologramVisible} className="">
                        <div className="w-full overflow-hidden">
                            <div
                                className="flex w-[300%] transition-transform duration-500 ease-in-out"
                                style={{ transform: step === 1 ? 'translateX(0%)' : step === 2 ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}
                            >
                                {/* ── Panel 1: Community Selection ── */}
                                <div className="w-1/3 shrink-0 flex flex-col gap-1.5 px-4 py-1">
                                    <h3 className="text-center font-bold text-sky-400 tracking-widest uppercase mb-1 drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] text-xs">
                                        Select Instance
                                    </h3>
                                    <div className="space-y-2 max-h-[22vh] overflow-y-auto custom-scrollbar pr-2">
                                        {COMMUNITIES.map((community) => (
                                            <button
                                                key={community.id}
                                                onClick={() => setSelectedCommunityId(community.id)}
                                                className={cn(
                                                    "w-full p-2.5 rounded-xl border border-sky-500/30 bg-sky-950/40 backdrop-blur-md transition-all flex items-center justify-between group hover:border-sky-400 hover:bg-sky-900/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]",
                                                    selectedCommunityId === community.id && "border-sky-400 bg-sky-900/60 shadow-[0_0_30px_rgba(56,189,248,0.6)]"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Globe className={cn(
                                                        "w-5 h-5",
                                                        selectedCommunityId === community.id ? "text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,1)]" : "text-sky-500/70"
                                                    )} />
                                                    <div className="text-left">
                                                        <span className={cn(
                                                            "font-medium block",
                                                            selectedCommunityId === community.id ? "text-sky-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" : "text-sky-400/80"
                                                        )}>{community.name}</span>
                                                        <span className="text-[10px] text-sky-500/60 font-mono block mt-0.5">{community.url}</span>
                                                    </div>
                                                </div>
                                                {selectedCommunityId === community.id && (
                                                    <Check className="w-5 h-5 text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,1)] shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        <button
                                            onClick={handleNextStep}
                                            disabled={!selectedCommunityId}
                                            className="w-full bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/50 disabled:opacity-50 text-sky-100 font-bold py-2 text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 font-mono uppercase tracking-widest backdrop-blur-md"
                                        >
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <p className="text-center text-[10px] md:text-xs text-sky-400/60 font-mono drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]">
                                            Already registered? <Link to="/login" className="text-sky-300 font-bold hover:underline drop-shadow-[0_0_8px_rgba(125,211,252,1)]">Login</Link>
                                        </p>
                                    </div>
                                </div>

                                {/* ── Panel 2: Account Details ── */}
                                <div className="w-1/3 shrink-0 flex flex-col gap-1 px-4 py-1">
                                    <div className="flex items-center gap-3 mb-0">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="inline-flex items-center text-[10px] text-sky-400/60 hover:text-sky-300 transition-colors font-mono uppercase tracking-widest"
                                        >
                                            <ChevronLeft className="w-3 h-3 mr-1" /> Back
                                        </button>
                                        <h3 className="font-bold text-sky-400 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] font-mono text-xs">
                                            Account Details
                                        </h3>
                                    </div>
                                    {error && (
                                        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-sky-400/60 uppercase tracking-widest ml-1 font-mono">Display Name</label>
                                        <input
                                            type="text"
                                            value={formData.display_name}
                                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            required
                                            placeholder="John Doe"
                                            className="w-full bg-sky-950/40 border border-sky-500/30 rounded-xl p-2 text-sky-100 focus:outline-none focus:border-sky-400/60 transition-all placeholder:text-sky-500/30 font-mono text-sm backdrop-blur-md"
                                        />
                                    </div>
                                    <div className="space-y-1 relative">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-sky-400/60 uppercase tracking-widest font-mono">Username</label>
                                            {isCheckingUsername && <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500/60 font-mono">@</span>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                                required
                                                placeholder="your_username"
                                                className={cn(
                                                    "w-full bg-sky-950/40 border rounded-xl p-2 pl-8 text-sky-100 focus:outline-none transition-all placeholder:text-sky-500/30 font-mono text-sm backdrop-blur-md",
                                                    usernameError ? "border-destructive/50" : "border-sky-500/30 focus:border-sky-400/60"
                                                )}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {usernameAvailable === true && !usernameError && <Check className="w-4 h-4 text-emerald-400" />}
                                            </div>
                                        </div>
                                        {usernameError && <p className="text-[10px] font-bold text-destructive ml-1">{usernameError}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-sky-400/60 uppercase tracking-widest ml-1 font-mono">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="you@example.com"
                                            className="w-full bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 text-sky-100 focus:outline-none focus:border-sky-400/60 transition-all placeholder:text-sky-500/30 font-mono text-sm backdrop-blur-md"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-sky-400/60 uppercase tracking-widest ml-1 font-mono">Password</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                placeholder="Password"
                                                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 text-sky-100 focus:outline-none focus:border-sky-400/60 transition-all placeholder:text-sky-500/30 font-mono text-sm backdrop-blur-md"
                                            />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                placeholder="Confirm"
                                                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 text-sky-100 focus:outline-none focus:border-sky-400/60 transition-all placeholder:text-sky-500/30 font-mono text-sm backdrop-blur-md"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-sky-500/20 bg-sky-950/30 backdrop-blur-md">
                                        <Checkbox
                                            id="is_discoverable"
                                            checked={formData.is_discoverable || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_discoverable: checked === true })}
                                            className="data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-400"
                                        />
                                        <label htmlFor="is_discoverable" className="text-[10px] font-bold text-sky-300/80 cursor-pointer uppercase tracking-widest font-mono">
                                            Global Visibility
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (usernameError || usernameAvailable === false) return;
                                            if (formData.password !== confirmPassword) { setError('Passwords do not match'); return; }
                                            if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
                                            setStep(3);
                                        }}
                                        disabled={loading || !!usernameError || usernameAvailable === false}
                                        className="w-full bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/50 disabled:opacity-50 text-sky-100 font-bold py-2.5 text-xs md:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 font-mono uppercase tracking-widest backdrop-blur-md mt-1"
                                    >
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* ── Panel 3: Avatar Selection ── */}
                                <div className="w-1/3 shrink-0 flex flex-col items-center gap-2 px-6 py-1">
                                    <h3 className="text-center font-bold text-sky-400 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] text-xs">
                                        Identity Projected
                                    </h3>
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400/50 shadow-[0_0_30px_rgba(56,189,248,0.6)] relative bg-black/50">
                                        <img
                                            src={formData.avatar_url}
                                            alt="Selected Avatar"
                                            className="w-full h-full object-cover mix-blend-screen"
                                            style={{ filter: "brightness(1.5) contrast(1.2) hue-rotate(-20deg) drop-shadow(0 0 10px rgba(56,189,248,0.8))" }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 w-full px-4">
                                        {formData.avatar_url && !formData.avatar_url.startsWith('/avatars/') && (
                                            <button type="button" className="aspect-square rounded-xl overflow-hidden transition-all duration-300 border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] bg-black/50">
                                                <img src={formData.avatar_url} alt="Custom" className="w-full h-full object-cover mix-blend-screen" style={{ filter: "brightness(1.5) contrast(1.2) hue-rotate(-20deg)" }} />
                                            </button>
                                        )}
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar_url: `/avatars/avatar_${num}.png` })}
                                                className={cn(
                                                    "aspect-square rounded-xl overflow-hidden transition-all duration-300 border-2 bg-black/50",
                                                    formData.avatar_url === `/avatars/avatar_${num}.png`
                                                        ? "border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-110"
                                                        : "border-transparent border-sky-500/20 hover:border-sky-400/50 hover:scale-105 opacity-70"
                                                )}
                                            >
                                                <img src={`/avatars/avatar_${num}.png`} alt={`Avatar ${num}`} className="w-full h-full object-cover mix-blend-screen" style={{ filter: "brightness(1.5) contrast(1.2) hue-rotate(-20deg)" }} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="w-full flex flex-col gap-3">
                                        <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingAvatar}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-400/50 text-sky-300 hover:bg-sky-500/20 transition-colors font-mono text-xs font-bold tracking-widest uppercase disabled:opacity-50 backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                                        >
                                            {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {uploadingAvatar ? 'Uploading...' : 'Upload Custom'}
                                        </button>
                                        <div className="flex gap-3 w-full">
                                            <button onClick={() => setStep(2)} className="flex-1 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 font-bold py-2.5 text-xs rounded-xl transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-widest backdrop-blur-md">
                                                <ChevronLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="flex-[2] bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/40 disabled:opacity-50 text-emerald-100 font-bold py-2.5 text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2 font-mono uppercase tracking-widest backdrop-blur-md"
                                            >
                                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</> : <><Check className="w-4 h-4" /> Complete</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </HologramProjector>
                </div>{/* end hologram absolute wrapper */}

                {/* Space Device pinned at top:275px — beam bottom (295+80=375px) = device centre (275+100=375px) ✓ */}
                <SpaceDeviceFrame
                    isFlat
                    isHorizontal
                    className="opacity-0"
                    wrapperClassName="z-10 shadow-2xl absolute left-0 right-0 mx-auto w-full h-[200px] transition-all duration-700"
                    style={{ top: 275 }}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="absolute w-[100px] h-[40px] bg-sky-400/40 rounded-[100%] blur-[15px]" />
                        <Orbit
                            className="relative w-16 h-16 text-sky-200 drop-shadow-[0_0_20px_rgba(56,189,248,1)]"
                            style={{ animation: 'spin 12s linear infinite' }}
                        />
                    </div>
                </SpaceDeviceFrame>
            </div>{/* end group */}
        </div>
    );
};



