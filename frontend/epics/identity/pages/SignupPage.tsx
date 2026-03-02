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
const DESIGN_H = 620;  // px — taller canvas gives hologram more vertical space

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
                    transform: `scale(${groupScale}) translateY(60px)`,
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
                        {/* scanline overlay over all panels */}
                        <div className="w-full overflow-hidden relative">
                            <div className="pointer-events-none absolute inset-0 z-30" style={{
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
                                mixBlendMode: 'multiply'
                            }} />
                            <div
                                className="flex w-[300%] transition-transform duration-500 ease-in-out"
                                style={{ transform: step === 1 ? 'translateX(0%)' : step === 2 ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}
                            >
                                {/* ── Panel 1: Community Selection ── */}
                                <div className="w-1/3 shrink-0 flex flex-col gap-2 px-4 py-2">
                                    {/* header */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                                        <h3 className="text-center font-bold text-amber-400 tracking-[0.3em] uppercase text-[9px] font-mono drop-shadow-[0_0_8px_rgba(255,146,0,1)]">
                                            SELECT INSTANCE
                                        </h3>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                                    </div>

                                    <div className="space-y-1.5 max-h-[22vh] overflow-y-auto custom-scrollbar pr-1">
                                        {COMMUNITIES.map((community) => (
                                            <button
                                                key={community.id}
                                                onClick={() => setSelectedCommunityId(community.id)}
                                                className={cn(
                                                    "w-full p-2.5 border transition-all flex items-center justify-between group relative overflow-hidden",
                                                    "bg-amber-950/20 backdrop-blur-md",
                                                    selectedCommunityId === community.id
                                                        ? "border-amber-400/80 shadow-[0_0_18px_rgba(255,146,0,0.6),inset_0_0_20px_rgba(255,146,0,0.1)]"
                                                        : "border-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_10px_rgba(255,146,0,0.2)]"
                                                )}
                                                style={{ clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)' }}
                                            >
                                                {/* active glow sweep */}
                                                {selectedCommunityId === community.id && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/8 to-transparent animate-pulse" />
                                                )}
                                                <div className="flex items-center gap-2.5 relative z-10">
                                                    <Globe className={cn(
                                                        "w-4 h-4 shrink-0",
                                                        selectedCommunityId === community.id ? "text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "text-amber-600/50"
                                                    )} />
                                                    <div className="text-left">
                                                        <span className={cn(
                                                            "font-mono font-bold block text-[11px] tracking-wider",
                                                            selectedCommunityId === community.id ? "text-amber-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "text-amber-500/60"
                                                        )}>{community.name}</span>
                                                        <span className="text-[9px] text-amber-600/40 font-mono block mt-0.5 tracking-widest">{community.url}</span>
                                                    </div>
                                                </div>
                                                {selectedCommunityId === community.id && (
                                                    <Check className="w-4 h-4 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,1)] shrink-0 relative z-10" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-1.5 mt-1">
                                        <button
                                            onClick={handleNextStep}
                                            disabled={!selectedCommunityId}
                                            className="w-full relative overflow-hidden disabled:opacity-40 font-mono text-[10px] font-bold tracking-[0.25em] uppercase py-2.5 transition-all"
                                            style={{
                                                background: selectedCommunityId ? 'linear-gradient(90deg, rgba(234,88,12,0.15), rgba(245,158,11,0.25), rgba(234,88,12,0.15))' : 'rgba(234,88,12,0.05)',
                                                border: '1px solid rgba(245,158,11,0.5)',
                                                clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                                                color: '#fef3c7',
                                                boxShadow: selectedCommunityId ? '0 0 20px rgba(234,88,12,0.3), inset 0 0 20px rgba(234,88,12,0.05)' : 'none'
                                            }}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                Continue <ArrowRight className="w-3.5 h-3.5" />
                                            </span>
                                        </button>
                                        <p className="text-center text-[9px] text-amber-600/50 font-mono tracking-widest">
                                            REGISTERED? <Link to="/login" className="text-amber-400 font-bold hover:text-amber-200 transition-colors drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]">LOGIN</Link>
                                        </p>
                                    </div>
                                </div>

                                {/* ── Panel 2: Account Details ── */}
                                <div className="w-1/3 shrink-0 flex flex-col gap-1 px-4 py-1">
                                    {/* title bar */}
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <button onClick={() => setStep(1)} className="inline-flex items-center text-[9px] text-amber-600/70 hover:text-amber-400 transition-colors font-mono uppercase tracking-widest">
                                            <ChevronLeft className="w-3 h-3" /> BACK
                                        </button>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                                        <h3 className="font-bold text-amber-400 tracking-[0.25em] uppercase font-mono text-[9px] drop-shadow-[0_0_8px_rgba(255,146,0,1)]">ACCOUNT::DETAILS</h3>
                                        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
                                    </div>

                                    {error && (
                                        <div className="px-2.5 py-1.5 border border-red-500/40 bg-red-950/30 text-red-300 text-[9px] font-mono flex items-center gap-2" style={{ clipPath: 'polygon(6px 0%,100% 0%,100% 100%,0% 100%,0% 6px)' }}>
                                            <AlertCircle className="w-3 h-3 shrink-0" />{error}
                                        </div>
                                    )}

                                    {/* holo-input helper */}
                                    {([
                                        { label: 'DISPLAY NAME', type: 'text', value: formData.display_name, key: 'display_name', placeholder: 'John Doe' },
                                        { label: 'EMAIL', type: 'email', value: formData.email, key: 'email', placeholder: 'you@example.com' },
                                    ] as const).map(({ label, type, value, key, placeholder }) => (
                                        <div key={key} className="space-y-0.5">
                                            <label className="text-[8px] font-bold text-amber-500/60 uppercase tracking-[0.25em] ml-1 font-mono flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-amber-500/60 inline-block" />{label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={type} value={value}
                                                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                    required placeholder={placeholder}
                                                    className="w-full bg-amber-950/20 border-b border-amber-600/40 py-1.5 px-2 text-amber-100 focus:outline-none focus:border-amber-400/80 transition-all placeholder:text-amber-700/40 font-mono text-[11px] tracking-wide"
                                                    style={{ background: 'linear-gradient(90deg, rgba(234,88,12,0.05), rgba(234,88,12,0.02))' }}
                                                />
                                                <div className="absolute bottom-0 left-0 w-0 h-px bg-sky-300 transition-all duration-300 peer-focus:w-full" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* username field */}
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[8px] font-bold text-amber-500/60 uppercase tracking-[0.25em] font-mono flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-amber-500/60 inline-block" />USERNAME
                                            </label>
                                            {isCheckingUsername && <Loader2 className="w-2.5 h-2.5 text-sky-400 animate-spin" />}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/50 font-mono text-[11px]">@</span>
                                            <input
                                                type="text" value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                                                required placeholder="your_username"
                                                className={cn(
                                                    "w-full bg-amber-950/20 border-b py-1.5 px-2 pl-6 text-amber-100 focus:outline-none transition-all placeholder:text-amber-700/40 font-mono text-[11px] tracking-wide",
                                                    usernameError ? "border-red-500/50" : "border-amber-600/40 focus:border-amber-400/80"
                                                )}
                                                style={{ background: 'linear-gradient(90deg, rgba(234,88,12,0.05), rgba(234,88,12,0.02))' }}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                {usernameAvailable === true && !usernameError && <Check className="w-3 h-3 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" />}
                                            </div>
                                        </div>
                                        {usernameError && <p className="text-[9px] font-bold text-red-400 ml-1 font-mono">{usernameError}</p>}
                                    </div>

                                    {/* password row */}
                                    <div className="space-y-0.5">
                                        <label className="text-[8px] font-bold text-amber-500/60 uppercase tracking-[0.25em] ml-1 font-mono flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-amber-500/60 inline-block" />PASSWORD
                                        </label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {(['password', 'confirmPassword'] as const).map((k, i) => (
                                                <input key={k} type="password"
                                                    value={k === 'password' ? formData.password : confirmPassword}
                                                    onChange={(e) => k === 'password' ? setFormData({ ...formData, password: e.target.value }) : setConfirmPassword(e.target.value)}
                                                    required placeholder={i === 0 ? 'Password' : 'Confirm'}
                                                    className="w-full bg-amber-950/20 border-b border-amber-600/40 py-1.5 px-2 text-amber-100 focus:outline-none focus:border-amber-400/80 transition-all placeholder:text-amber-700/40 font-mono text-[11px]"
                                                    style={{ background: 'linear-gradient(90deg, rgba(234,88,12,0.05), rgba(234,88,12,0.02))' }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* visibility toggle */}
                                    <div className="flex items-center gap-2 px-1 py-1 border border-amber-500/15 bg-amber-950/20"
                                        style={{ clipPath: 'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)' }}>
                                        <Checkbox
                                            id="is_discoverable"
                                            checked={formData.is_discoverable || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_discoverable: checked === true })}
                                            className="w-3.5 h-3.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-400"
                                        />
                                        <label htmlFor="is_discoverable" className="text-[9px] font-bold text-amber-400/80 cursor-pointer uppercase tracking-[0.2em] font-mono">
                                            GLOBAL VISIBILITY
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
                                        className="w-full relative overflow-hidden disabled:opacity-40 font-mono text-[10px] font-bold tracking-[0.25em] uppercase py-2 transition-all mt-0.5"
                                        style={{
                                            background: 'linear-gradient(90deg, rgba(234,88,12,0.15), rgba(245,158,11,0.28), rgba(234,88,12,0.15))',
                                            border: '1px solid rgba(245,158,11,0.5)',
                                            clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                                            color: '#fef3c7',
                                            boxShadow: '0 0 18px rgba(234,88,12,0.3), inset 0 0 16px rgba(234,88,12,0.05)'
                                        }}
                                    >
                                        Continue <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                                    </button>
                                </div>

                                {/* ── Panel 3: Avatar Selection ── */}
                                <div className="w-1/3 shrink-0 flex flex-col gap-2 px-3 py-2">
                                    {/* title */}
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                                        <h3 className="text-center font-bold text-amber-400 tracking-[0.28em] uppercase text-[9px] font-mono drop-shadow-[0_0_8px_rgba(255,146,0,1)]">
                                            IDENTITY::PROJECTED
                                        </h3>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                                    </div>

                                    {/* two-column: large preview + picker grid */}
                                    <div className="flex gap-3 w-full">
                                        {/* LEFT: large selected avatar */}
                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                            <div className="relative">
                                                <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping"
                                                    style={{ animationDuration: '2.2s', transform: 'scale(1.15)' }} />
                                                <div className="absolute inset-0 rounded-full border border-amber-500/12 animate-ping"
                                                    style={{ animationDuration: '3s', transform: 'scale(1.35)' }} />
                                                <div className="w-[72px] h-[72px] rounded-full overflow-hidden relative bg-black/60"
                                                    style={{
                                                        border: '2px solid rgba(251,191,36,0.75)',
                                                        boxShadow: '0 0 22px rgba(255,146,0,0.7), 0 0 50px rgba(255,146,0,0.2), inset 0 0 20px rgba(234,88,12,0.1)'
                                                    }}>
                                                    <img
                                                        src={formData.avatar_url}
                                                        alt="Selected Avatar"
                                                        className="w-full h-full object-cover mix-blend-screen"
                                                        style={{ filter: "brightness(1.5) contrast(1.2) sepia(100%) hue-rotate(-15deg) saturate(140%)" }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-mono text-sky-400/60 tracking-widest uppercase mt-0.5">SELECTED</span>
                                        </div>

                                        {/* RIGHT: compact picker + upload */}
                                        <div className="flex-1 flex flex-col gap-1.5">
                                            <div className="grid grid-cols-4 gap-1">
                                                {formData.avatar_url && !formData.avatar_url.startsWith('/avatars/') && (
                                                    <button type="button" className="aspect-square overflow-hidden border border-amber-400/70 shadow-[0_0_8px_rgba(255,146,0,0.4)] bg-black/50"
                                                        style={{ clipPath: 'polygon(4px 0%,100% 0%,100% calc(100% - 4px),calc(100% - 4px) 100%,0% 100%,0% 4px)' }}>
                                                        <img src={formData.avatar_url} alt="Custom" className="w-full h-full object-cover mix-blend-screen"
                                                            style={{ filter: "brightness(1.4) contrast(1.1) sepia(100%) hue-rotate(-15deg) saturate(120%)" }} />
                                                    </button>
                                                )}
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                                    <button key={num} type="button"
                                                        onClick={() => setFormData({ ...formData, avatar_url: `/avatars/avatar_${num}.png` })}
                                                        className={cn(
                                                            "aspect-square overflow-hidden transition-all duration-200 bg-black/50",
                                                            formData.avatar_url === `/avatars/avatar_${num}.png`
                                                                ? "scale-105"
                                                                : "border border-amber-600/20 hover:border-amber-400/50 hover:scale-105 opacity-70 hover:opacity-100"
                                                        )}
                                                        style={{
                                                            clipPath: 'polygon(4px 0%,100% 0%,100% calc(100% - 4px),calc(100% - 4px) 100%,0% 100%,0% 4px)',
                                                            ...(formData.avatar_url === `/avatars/avatar_${num}.png` ? {
                                                                border: '1.5px solid rgba(251,191,36,0.85)',
                                                                boxShadow: '0 0 12px rgba(255,146,0,0.6)'
                                                            } : {})
                                                        }}
                                                    >
                                                        <img src={`/avatars/avatar_${num}.png`} alt={`Avatar ${num}`} className="w-full h-full object-cover mix-blend-screen"
                                                            style={{ filter: "brightness(1.4) contrast(1.1) sepia(100%) hue-rotate(-15deg) saturate(120%)" }} />
                                                    </button>
                                                ))}
                                            </div>
                                            <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                                                className="w-full flex items-center justify-center gap-1 py-1 font-mono text-[8px] font-bold tracking-[0.18em] uppercase text-amber-400/70 hover:text-amber-200 disabled:opacity-50 transition-colors"
                                                style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(234,88,12,0.04)' }}>
                                                {uploadingAvatar ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
                                                {uploadingAvatar ? 'UPLOADING...' : 'UPLOAD CUSTOM'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* nav buttons */}
                                    <div className="flex gap-2 w-full mt-auto">
                                        <button onClick={() => setStep(2)}
                                            className="flex-1 font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-amber-500/60 hover:text-amber-400 py-2 transition-colors flex items-center justify-center gap-1"
                                            style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                                            <ChevronLeft className="w-3 h-3" /> BACK
                                        </button>
                                        <button onClick={handleSubmit} disabled={loading}
                                            className="flex-[2] relative overflow-hidden disabled:opacity-40 font-mono text-[10px] font-bold tracking-[0.2em] uppercase py-2 transition-all"
                                            style={{
                                                background: 'linear-gradient(90deg, rgba(52,211,153,0.12), rgba(52,211,153,0.22), rgba(52,211,153,0.12))',
                                                border: '1px solid rgba(52,211,153,0.5)',
                                                clipPath: 'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)',
                                                color: '#6ee7b7',
                                                boxShadow: '0 0 15px rgba(52,211,153,0.3)'
                                            }}>
                                            {loading ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />FINALIZING</> : <><Check className="w-3 h-3 inline mr-1" />COMPLETE</>}
                                        </button>
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
                        <div className="absolute w-[100px] h-[40px] bg-amber-500/30 rounded-[100%] blur-[15px]" />
                        <Orbit
                            className="relative w-16 h-16 text-amber-100 drop-shadow-[0_0_20px_rgba(255,146,0,0.8)]"
                            style={{ animation: 'spin 12s linear infinite' }}
                        />
                    </div>
                </SpaceDeviceFrame>
            </div>{/* end group */}
        </div>
    );
};



