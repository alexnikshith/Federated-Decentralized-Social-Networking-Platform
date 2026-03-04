import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { SignupRequest } from '../types';
import { COMMUNITIES } from '../../../src/config/communities';
import { Users, Globe, ArrowRight, Check, AlertCircle, Loader2, ChevronLeft, Upload, Orbit, Eye, EyeOff, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IdentityLayout } from '../../../src/components/auth/IdentityLayout';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isSwitchingPage, setIsSwitchingPage] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

    // Real-time password validation logic
    const passwordRequirements = {
        min8: formData.password.length >= 8,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /\d/.test(formData.password),
        hasSpecial: /[@$!%*?&]/.test(formData.password),
    };

    const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
    const passwordsMatch = formData.password === confirmPassword && formData.password !== '';

    // Auto-clear errors after 3 seconds and reset causative fields
    useEffect(() => {
        if (error || emailError || usernameError) {
            const timer = setTimeout(() => {
                if (usernameError) setFormData(prev => ({ ...prev, username: '' }));
                if (emailError) setFormData(prev => ({ ...prev, email: '' }));
                if (error) {
                    setFormData(prev => ({ ...prev, password: '' }));
                    setConfirmPassword('');
                }
                setError('');
                setEmailError('');
                setUsernameError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, emailError, usernameError]);

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
                if (taken) setUsernameError('This username is already taken');
            } catch (err) {
                console.error('Failed to check username', err);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.username]);

    useEffect(() => {
        if (!formData.email) {
            setEmailError('');
            setEmailAvailable(null);
            return;
        }
        // Basic email regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setEmailError('Invalid email format');
            setEmailAvailable(null);
            return;
        }
        setEmailError('');
        const timer = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const taken = await authApi.checkEmail(formData.email);
                setEmailAvailable(!taken);
                if (taken) setEmailError('This email is already registered');
            } catch (err) {
                console.error('Failed to check email', err);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.email]);

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
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
        setLoading(true);
        try {
            await authApi.signup(formData);
            setIsRegistered(true);
            setTimeout(() => {
                navigate('/login', { state: { email: formData.email, signupSuccess: true } });
            }, 1000);
        } catch (error) {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setError(errorMessage || 'Signup failed. Please try again.');
            setLoading(false);
        }
    };

    const handleSwitchToLogin = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsSwitchingPage(true);
        setTimeout(() => {
            navigate('/login');
        }, 0);
    };

    return (
        <IdentityLayout isExiting={isSwitchingPage} isCinematic={false} theme={isRegistered ? 'emerald' : 'amber'}>
            {isRegistered ? (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-emerald-950/20 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping-slow scale-150" />
                        <div className="w-20 h-20 rounded-full border-2 border-emerald-400 flex items-center justify-center bg-emerald-950/40 relative z-10">
                            <Check className="w-10 h-10 text-emerald-400" />
                        </div>
                    </div>
                    <h2 className="mt-8 text-2xl font-bold text-emerald-500 tracking-[0.5em] uppercase font-mono animate-pulse">SUCCESSFULLY REGISTERED!</h2>
                    <p className="mt-4 text-emerald-400/60 font-mono text-xs tracking-widest uppercase">Initializing community access...</p>
                </div>
            ) : (
                <>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '100% 3px' }} />

                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-500/40 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-500/40 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-500/40 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-500/40 rounded-br-2xl" />

                    {/* Fixed Navigation Overlay */}
                    <div className="absolute top-4 left-6 z-[100]">
                        <button
                            onClick={() => {
                                if (step === 1) {
                                    setIsSwitchingPage(true);
                                    setTimeout(() => {
                                        navigate('/');
                                    }, 0);
                                } else {
                                    setStep((prev) => (prev - 1) as 1 | 2 | 3);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500/60 hover:text-amber-500 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group active:scale-95"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[10px] font-mono tracking-[0.2em] font-bold uppercase">BACK</span>
                        </button>
                    </div>

                    <div
                        className="flex w-[300%] h-full transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] relative z-40"
                        style={{ transform: step === 1 ? 'translateX(0%)' : step === 2 ? 'translateX(-33.333%)' : 'translateX(-66.666%)' }}
                    >
                        {/* ── Panel 1: Community Selection ── */}
                        <div className="w-1/3 shrink-0 flex items-stretch">
                            {/* Left Column: Welcome Heading */}
                            <div className="flex-1 flex flex-col items-center justify-center px-10 relative">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-center"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                                        <Globe className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <h1 className="text-3xl font-light tracking-[0.2em] uppercase text-white mb-2">
                                        Welcome to <span className="font-bold text-amber-400">Nexus</span>
                                    </h1>
                                    <p className="text-sm font-mono tracking-widest text-amber-100/40 uppercase">
                                        Identity Registration Protocol
                                    </p>
                                </motion.div>
                            </div>

                            {/* Vertical Divider */}
                            <div className="w-[1px] bg-amber-500/10 my-10" />

                            {/* Right Column: Community List */}
                            <div className="flex-1 flex flex-col px-10 pt-10 pb-6 relative">
                                <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2 flex-shrink-0">
                                    <h2 className="text-lg font-bold text-amber-500 tracking-[0.4em] uppercase font-mono">COMMUNITY</h2>
                                    <div className="text-xs font-mono text-amber-500/40">[ PHASE_01 ]</div>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-3">
                                    {COMMUNITIES.map((community) => (
                                        <button
                                            key={community.id}
                                            onClick={() => setSelectedCommunityId(community.id)}
                                            className={cn(
                                                "w-full p-4 border rounded-xl transition-all flex items-center justify-between group relative overflow-hidden",
                                                "bg-amber-500/[0.02] backdrop-blur-md",
                                                selectedCommunityId === community.id
                                                    ? "border-amber-400 shadow-[0_0_20px_rgba(255,146,0,0.2),inset_0_0_15px_rgba(255,146,0,0.05)] bg-amber-500/[0.08]"
                                                    : "border-amber-500/10 hover:border-amber-400/40 hover:bg-amber-500/[0.04]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
                                                    selectedCommunityId === community.id ? "bg-amber-500/20 border-amber-400/50" : "bg-black/40 border-amber-500/10"
                                                )}>
                                                    <Globe className={cn("w-5 h-5", selectedCommunityId === community.id ? "text-amber-200" : "text-amber-600/40")} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={cn("font-mono font-bold block text-sm tracking-wider", selectedCommunityId === community.id ? "text-amber-100" : "text-amber-500/60")}>{community.name}</span>
                                                    <span className="text-[10px] text-amber-600/40 font-mono block mt-0.5 uppercase tracking-widest">{community.url}</span>
                                                </div>
                                            </div>
                                            {selectedCommunityId === community.id && (
                                                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                                    <Check className="w-3 h-3 text-amber-950 stroke-[3]" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-amber-500/10 flex-shrink-0">
                                    <button type="button" onClick={handleNextStep} disabled={!selectedCommunityId} className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40">
                                        <span className="relative z-10 font-mono text-base font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3">
                                            CONTINUE <ArrowRight className="w-4 h-4" />
                                        </span>
                                        {selectedCommunityId && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />}
                                    </button>
                                    <p className="text-center mt-4 text-xs text-amber-500/70 font-mono tracking-[0.2em] uppercase">
                                        ALREADY_REGISTERED? <button onClick={handleSwitchToLogin} className="text-amber-400 font-bold hover:text-amber-200 transition-colors">LOGIN</button>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Panel 2: Account Details ── */}
                        <div className="w-1/3 shrink-0 flex flex-col gap-0 px-10 pt-14 pb-6 border-l border-amber-500/10">
                            <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2">
                                <h2 className="text-lg font-bold text-amber-500 tracking-[0.4em] uppercase font-mono">ACCOUNT DETAILS</h2>
                                <div className="text-xs font-mono text-amber-500/40">[ PHASE_02 ]</div>
                            </div>

                            <AnimatePresence mode="popLayout">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="px-3 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-[10px] font-mono flex items-center gap-2 overflow-hidden"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {/* LEFT COLUMN: IDENTITY & VISIBILITY */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-mono">
                                            <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                            <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">IDENTITY</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">DISPLAY_NAME</label>
                                                <input
                                                    type="text" value={formData.display_name}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, display_name: e.target.value });
                                                        setError('');
                                                    }}
                                                    required placeholder="John Doe"
                                                    className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 px-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono">USERNAME</label>
                                                    {isCheckingUsername && <Loader2 className="w-3 h-3 text-amber-500/50 animate-spin" />}
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/40 font-mono text-sm">@</span>
                                                    <input
                                                        type="text" value={formData.username}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, username: e.target.value.toLowerCase() });
                                                            setError('');
                                                            setUsernameError('');
                                                        }}
                                                        required placeholder="username"
                                                        className={cn(
                                                            "w-full bg-amber-500/[0.03] border rounded-lg py-2 pl-7 pr-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30",
                                                            usernameError ? "border-red-500/40" : "border-amber-500/20 focus:border-amber-400"
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {usernameError && (
                                                <motion.p
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="text-[10px] font-bold text-red-400/80 ml-1 font-mono uppercase overflow-hidden"
                                                >
                                                    {usernameError}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-mono">
                                            <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                            <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">VISIBILITY</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                                        </div>
                                        <div className="flex items-start gap-4 p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl">
                                            <div className="pt-1.5">
                                                <div
                                                    onClick={() => setFormData({ ...formData, is_discoverable: !formData.is_discoverable })}
                                                    className={cn(
                                                        "w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 border",
                                                        formData.is_discoverable ? "bg-amber-500/30 border-amber-400" : "bg-amber-950 border-amber-800"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300",
                                                        formData.is_discoverable ? "right-1 bg-amber-100 shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "left-1 bg-amber-900"
                                                    )} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-amber-200 uppercase tracking-widest font-mono">Global Discovery</h4>
                                                <p className="text-[10px] text-amber-400/80 font-mono leading-relaxed">Your profile will be visible to users across all communities. It lets other users find you and connect with you.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    username: '',
                                                    email: '',
                                                    password: '',
                                                    display_name: '',
                                                    is_discoverable: true
                                                });
                                                setConfirmPassword('');
                                            }}
                                            className="px-6 py-2 rounded-lg border border-amber-500/40 bg-amber-500/5 text-xs font-mono font-bold text-amber-400 hover:text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 transition-all uppercase tracking-widest active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                        >
                                            RESET
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: CREDENTIALS & RULES */}
                                <div className="flex flex-col h-full space-y-3">
                                    <div className="flex items-center gap-2 font-mono">
                                        <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                        <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">CREDENTIALS</span>
                                        <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1.5 flex-1 relative">
                                            <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">EMAIL</label>
                                            <div className="relative">
                                                <input
                                                    type="email" value={formData.email}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, email: e.target.value });
                                                        setError('');
                                                        setEmailError('');
                                                    }}
                                                    required placeholder="you@nebula.net"
                                                    className={cn(
                                                        "w-full bg-amber-500/[0.03] border rounded-lg py-2 px-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30",
                                                        emailError ? "border-red-500/40" : "border-amber-500/20 focus:border-amber-400"
                                                    )}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {isCheckingEmail && <Loader2 className="w-3 h-3 text-amber-500/50 animate-spin" />}
                                                    {emailAvailable === true && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                                    {emailAvailable === false && <AlertCircle className="w-3 h-3 text-red-500/60" />}
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {emailError && (
                                                    <motion.p
                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        className="text-[10px] font-bold text-red-400/80 ml-1 font-mono uppercase overflow-hidden leading-none"
                                                    >
                                                        {emailError}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">PASSWORD</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"} value={formData.password}
                                                        onChange={(e) => {
                                                            setFormData({ ...formData, password: e.target.value });
                                                            setError('');
                                                        }}
                                                        required placeholder="••••••••"
                                                        className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-3 pr-10 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                                    />
                                                    <button
                                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/40 hover:text-amber-400 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block flex items-center gap-1.5">
                                                    CONFIRM
                                                    {passwordsMatch && formData.password.length > 0 && <Check size={10} className="text-green-400" />}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                                                        onChange={(e) => {
                                                            setConfirmPassword(e.target.value);
                                                            setError('');
                                                        }}
                                                        required placeholder="••••••••"
                                                        className={cn(
                                                            "w-full bg-amber-500/[0.03] border rounded-lg py-2 pl-3 pr-10 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30",
                                                            confirmPassword && !passwordsMatch ? "border-red-500/40" : "border-amber-500/20 focus:border-amber-400"
                                                        )}
                                                    />
                                                    <button
                                                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/40 hover:text-amber-400 transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RULES DESCRIPTION BOX */}
                                    <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-3 space-y-2 relative overflow-hidden group/rules transition-all hover:bg-amber-500/[0.05]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ShieldCheck size={14} className="text-amber-500/60" />
                                            <span className="text-xs font-bold text-amber-500/80 uppercase tracking-widest font-mono">Security Requirements</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            {[
                                                { label: 'Have atleast 8 characters', met: passwordRequirements.min8 },
                                                { label: 'Have atleast one uppercase letter', met: passwordRequirements.hasUpper },
                                                { label: 'Have atleast one lowercase letter', met: passwordRequirements.hasLower },
                                                { label: 'Have atleast one number', met: passwordRequirements.hasNumber },
                                                { label: 'Have atleast one special character', met: passwordRequirements.hasSpecial },
                                            ].map((req, i) => (
                                                <div key={i} className={cn(
                                                    "flex items-center gap-2 transition-all duration-300",
                                                    req.met ? "text-green-400 translate-x-1" : "text-amber-500/60"
                                                )}>
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                                                        req.met ? "bg-green-500/20 border-green-500/50" : "border-amber-500/20"
                                                    )}>
                                                        {req.met ? <Check size={10} className="stroke-[4]" /> : <div className="w-1 h-1 bg-current rounded-full" />}
                                                    </div>
                                                    <span className="text-xs font-mono tracking-tighter leading-none">{req.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Info size={32} className="text-amber-500" />
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!usernameError && usernameAvailable !== false && !isCheckingUsername && !emailError && emailAvailable !== false && !isCheckingEmail && isPasswordValid && passwordsMatch && formData.email) setStep(3);
                                            }}
                                            disabled={!isPasswordValid || !passwordsMatch || !formData.email || !formData.username || !formData.display_name || usernameAvailable === false || isCheckingUsername || emailAvailable === false || isCheckingEmail}
                                            className="relative group/btn py-3 px-10 overflow-hidden text-center disabled:opacity-20 transition-opacity"
                                        >
                                            <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3">
                                                CONTINUE <ArrowRight className="w-4 h-4" />
                                            </span>
                                            {(isPasswordValid && passwordsMatch && formData.email) && (
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Panel 3: Identity Mapping ── */}
                        <div className="w-1/3 shrink-0 flex flex-col gap-0 px-10 pt-16 pb-6">
                            <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2">
                                <h2 className="text-lg font-bold text-amber-500 tracking-[0.4em] uppercase font-mono">AVATAR</h2>
                                <div className="text-xs font-mono text-amber-500/40">[ PHASE_03 ]</div>
                            </div>

                            <div className="flex gap-12 w-full mt-2 items-center flex-1">
                                {/* Left Column: Selected + Presets */}
                                <div className="flex-1 flex flex-col items-center gap-4 justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full border border-amber-400/20 animate-ping" style={{ animationDuration: '3s' }} />
                                            <div className="w-[100px] h-[100px] rounded-full overflow-hidden relative bg-black/40 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
                                                <img src={formData.avatar_url} alt="Selected Avatar" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center border-2 border-black">
                                                <Check className="w-4 h-4 text-black stroke-[3]" />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-mono text-amber-100 font-bold uppercase tracking-widest">SELECTED</div>
                                            <div className="text-[8px] font-mono text-amber-500/40 uppercase">UID: {formData.avatar_url.split('/').pop()?.split('.')[0]}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 w-full max-w-[200px]">
                                        <div className="text-[9px] font-mono text-amber-500/40 uppercase tracking-[0.2em] text-center border-b border-amber-500/10 pb-1">Available Presets</div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                                                const url = `/avatars/avatar_${num}.png`;
                                                return (
                                                    <button
                                                        key={num}
                                                        onClick={() => setFormData({ ...formData, avatar_url: url })}
                                                        className={cn(
                                                            "aspect-square rounded-lg overflow-hidden border transition-all relative group",
                                                            formData.avatar_url === url
                                                                ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400"
                                                                : "border-amber-500/10 hover:border-amber-400/40"
                                                        )}
                                                    >
                                                        <img src={url} alt={`Avatar ${num}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        {formData.avatar_url === url && <div className="absolute inset-0 bg-amber-500/10" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Vertical Separator */}
                                <div className="w-[1px] h-32 bg-amber-500/10" />

                                {/* Right Column: Custom Upload */}
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    <div className="text-[10px] font-mono text-amber-500/40 uppercase tracking-[0.2em] text-center">Identity Upload</div>
                                    <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingAvatar}
                                        className="px-6 py-6 bg-amber-500/[0.05] border border-amber-500/20 rounded-xl text-xs font-mono font-bold text-amber-500/70 hover:text-amber-200 hover:bg-amber-500/10 transition-all flex flex-col items-center justify-center gap-3 w-48 group/upload"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover/upload:border-amber-500/40 transition-colors">
                                            {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                        </div>
                                        <span className="text-center">Choose Custom Image</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto flex justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="relative group/btn py-3 px-12 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-base font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3">
                                        {loading ? 'Registering...' : 'REGISTER'}
                                        {!loading && <Check className="w-4 h-4" />}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </IdentityLayout>
    );
};
