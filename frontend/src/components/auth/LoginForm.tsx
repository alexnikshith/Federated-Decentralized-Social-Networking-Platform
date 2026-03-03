import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Orbit, ChevronLeft, Globe, ArrowRight, Eye, EyeOff, Shield, KeyRound, Mail, CheckCircle2, Loader2, Info, AlertCircle, Check, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../config/communities";
import { cn } from "@/lib/utils";

interface LoginFormProps {
    onSuccess?: () => void;
    onSwitchToRegister?: () => void;
    onBackToLanding?: () => void;
    hideBackNav?: boolean;
    disablePrefill?: boolean;
}

export const LoginForm = ({
    onSuccess,
    onSwitchToRegister,
    onBackToLanding,
    hideBackNav = false,
    disablePrefill = false
}: LoginFormProps) => {
    const navigate = useNavigate();
    const { user, setAuth, isLoginExiting, setLoginExiting, startNebulaTransition } = useAuthStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [view, setView] = useState<'login' | 'login_otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('login');
    const [instance, setInstance] = useState(localStorage.getItem('active_community_url') || DEFAULT_COMMUNITY.url);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Email discovered states
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailRegistered, setEmailRegistered] = useState<boolean | null>(null);
    const [emailCheckError, setEmailCheckError] = useState<string | null>(null);

    // Real-time password validation logic
    const passwordRequirements = {
        min8: newPassword.length >= 8,
        hasUpper: /[A-Z]/.test(newPassword),
        hasLower: /[a-z]/.test(newPassword),
        hasNumber: /\d/.test(newPassword),
        hasSpecial: /[@$!%*?&]/.test(newPassword),
    };

    const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
    const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

    const location = useLocation();
    const [signupSuccess, setSignupSuccess] = useState(false);

    // Handle pre-fill from registration or store
    useEffect(() => {
        const state = location.state as { email?: string; signupSuccess?: boolean };
        if (state?.email) {
            setEmail(state.email);
        } else if (user && !disablePrefill && user.email) {
            setEmail(user.email);
        }

        if (state?.signupSuccess) {
            setSignupSuccess(true);
            toast.success("Account created successfully! Please sign in.");
        }
    }, [location.state, user, disablePrefill]);

    // Update localStorage when instance changes
    useEffect(() => {
        localStorage.setItem('active_community_url', instance);
        const comm = COMMUNITIES.find(c => c.url === instance);
        if (comm) {
            localStorage.setItem('active_community_id', comm.id);
        }
    }, [instance]);

    // Real-time email check
    useEffect(() => {
        if (!email || (view !== 'login' && view !== 'forgot_email')) {
            setEmailRegistered(null);
            setEmailCheckError(null);
            return;
        }

        // Basic email regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailCheckError(null);
            setEmailRegistered(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const taken = await authApi.checkEmail(email);
                setEmailRegistered(taken);
                if (!taken) {
                    setEmailCheckError('This email is not registered');
                } else {
                    setEmailCheckError(null);
                }
            } catch (err) {
                console.error('Failed to check email', err);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [email, instance, view]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (instance) {
            localStorage.setItem('active_community_url', instance);
            const match = COMMUNITIES.find(c => c.url === instance || c.url === `http://${instance}`);
            if (match) {
                localStorage.setItem('active_community_id', match.id);
            }
        }

        try {
            if (view === 'login') {
                const response = await authApi.login({ email, password });
                if (response.token) {
                    startNebulaTransition();
                    setLoginExiting(true);
                    toast.success("Welcome back!");
                    onSuccess && onSuccess();
                    setTimeout(() => {
                        setAuth(response.user, response.token);
                    }, 1000);
                    return;
                }
                setView('login_otp');
                toast.success(`Verification code sent to ${email}. Check your inbox.`);
            } else if (view === 'login_otp') {
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

    const handleForgotSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.forgotPassword(email);
            toast.success("If an account exists, a code has been sent.");
            setView('forgot_otp');
            setOtp("");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to send code";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.verifyResetCode({ email, code: otp });
            toast.success("Code verified successfully");
            setView('forgot_reset');
        } catch (error: any) {
            const message = error.response?.data?.message || "Invalid or expired code";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (!isPasswordValid) {
            toast.error("Password does not meet all requirements.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.resetPassword({ email, code: otp, new_password: newPassword });
            toast.success("Password reset successfully! Please login.");
            setView('login');
            setPassword("");
            setOtp("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to reset password";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Back Button */}
            {
                !hideBackNav && (
                    <div className="absolute top-4 left-6 z-[100]">
                        <button
                            onClick={() => {
                                if (view === 'login') {
                                    if (onBackToLanding) onBackToLanding();
                                    else navigate('/');
                                }
                                else setView('login');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500/60 hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all group active:scale-95"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[10px] font-mono tracking-[0.2em] font-bold uppercase">BACK</span>
                        </button>
                    </div>
                )
            }

            <div className="w-full max-w-[880px] mx-auto flex flex-col px-10 pt-10 pb-6 h-full relative z-40">
                {/* Decoration corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-emerald-500/40 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-emerald-500/40 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-emerald-500/40 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-emerald-500/40 rounded-br-2xl" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '100% 3px' }} />

                {/* Top Section: Heading */}
                <motion.div
                    className="w-full max-w-[500px] mx-auto flex items-center justify-between mb-8 border-b border-emerald-500/20 pb-2 flex-shrink-0"
                    initial={{ opacity: 1, y: -20 }}
                    animate={isLoginExiting ? { opacity: 0, y: -50 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                >
                    <h2 className="text-xl font-bold text-emerald-500 tracking-[0.4em] uppercase font-mono text-center flex-1">
                        {view === 'login' && "LOGIN"}
                        {view === 'login_otp' && "VERIFY USER"}
                        {view === 'forgot_email' && "RECOVERY"}
                        {view === 'forgot_otp' && "VERIFY EMAIL"}
                        {view === 'forgot_reset' && "RESET PASSWORD"}
                    </h2>
                    <div className="text-[10px] font-mono text-emerald-500/40 tracking-[0.2em] absolute right-0">[ AUTH_PHASE_01 ]</div>
                </motion.div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    animate={isLoginExiting ? { opacity: 0, y: 200 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                    className="relative w-full max-w-[440px] mx-auto z-10 space-y-4 flex-1 flex flex-col justify-center"
                >
                    {error && (
                        <div className="px-3 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-[10px] font-mono flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    {emailCheckError && (view === 'login' || view === 'forgot_email') && (
                        <div className="px-3 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-[10px] font-mono flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />{emailCheckError}
                        </div>
                    )}

                    {/* -- LOGIN VIEWS -- */}
                    {(view === 'login' || view === 'login_otp') && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            {view === 'login' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 font-mono mb-2">
                                            <div className="w-1.5 h-[1px] bg-emerald-500/80" />
                                            <span className="text-[10px] font-bold text-emerald-300/80 tracking-[0.2em] uppercase">SELECT COMMUNITY</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                        </div>
                                        <Select value={instance} onValueChange={setInstance}>
                                            <SelectTrigger className="w-full bg-emerald-500/[0.03] border-emerald-500/20 h-10 text-emerald-50 font-mono text-sm focus:ring-0 focus:ring-offset-0 focus:border-emerald-400">
                                                <div className="flex items-center gap-2">
                                                    <Orbit size={14} className="text-emerald-500" />
                                                    <SelectValue placeholder="Select Neural Node" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-emerald-950/95 border-emerald-500/20 backdrop-blur-xl">
                                                {COMMUNITIES.map((comm) => (
                                                    <SelectItem key={comm.id} value={comm.url} className="text-emerald-300/80 font-mono focus:bg-emerald-500/10 focus:text-emerald-100">
                                                        {comm.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 ">
                                        <div className="flex items-center gap-2 font-mono mb-2">
                                            <div className="w-1.5 h-[1px] bg-emerald-500/80" />
                                            <span className="text-[10px] font-bold text-emerald-300/80 tracking-[0.2em] uppercase">EMAIL_ADDR</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                        </div>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/40 w-4 h-4" />
                                            <input
                                                type="email" placeholder="you@nebula.net" value={email} onChange={(e) => setEmail(e.target.value)} required
                                                className={cn(
                                                    "w-full bg-emerald-500/[0.03] border rounded-lg py-2 pl-10 pr-10 text-emerald-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30",
                                                    emailCheckError ? "border-red-500/40" : "border-emerald-500/20 focus:border-emerald-400"
                                                )}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {isCheckingEmail && <Loader2 className="w-3 h-3 text-emerald-500/50 animate-spin" />}
                                                {emailRegistered === true && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                                {emailRegistered === false && <AlertCircle className="w-3 h-3 text-red-500/60" />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 ">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-mono">PASSWORD</label>
                                            <button
                                                type="button"
                                                onClick={() => setView('forgot_email')}
                                                className="text-[10px] font-mono text-emerald-200 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                                            >
                                                FORGOT PASSWORD?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-emerald-500/[0.03] border border-emerald-500/20 rounded-lg py-2 pl-3 pr-10 text-emerald-50 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-400 focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-mono mb-2">
                                        <div className="w-1.5 h-[1px] bg-emerald-500/80" />
                                        <span className="text-[10px] font-bold text-emerald-300/80 tracking-[0.2em] uppercase">VERIFICATION_CODE</span>
                                        <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-emerald-500/[0.03] border border-emerald-500/20 rounded-lg py-4 text-center text-3xl tracking-[0.5em] font-mono text-emerald-100 focus:outline-none focus:border-emerald-400 focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            className="text-[10px] font-mono text-emerald-500/40 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                                            onClick={() => setView('login')}
                                        >
                                            RESTART_HANDSHAKE
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || (view === 'login' && emailRegistered === false)}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-emerald-100 flex items-center justify-center gap-3">
                                        {isLoading ? "PROCESSING..." : (
                                            <>
                                                {view === 'login' ? "LOGIN" : "VERIFY_CODE"}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                </button>
                            </div>

                            {view === 'login' && (
                                <div className="pt-2">
                                    <p className="text-center text-[10px] text-emerald-500/40 font-mono tracking-[0.2em] uppercase">
                                        UNAUTHORIZED? {onSwitchToRegister ? (
                                            <button onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }} className="text-emerald-400 font-bold hover:text-emerald-200 transition-colors">REGISTER</button>
                                        ) : (
                                            <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-200 transition-colors">REGISTER</Link>
                                        )}
                                    </p>
                                </div>
                            )}
                        </form>
                    )}

                    {/* -- FORGOT PASSWORD VIEWS -- */}
                    {view === 'forgot_email' && (
                        <form onSubmit={handleForgotSendCode} className="space-y-4">
                            <div className="flex items-center gap-2 font-mono mb-2">
                                <div className="w-1.5 h-[1px] bg-emerald-500/80" />
                                <span className="text-[10px] font-bold text-emerald-300/80 tracking-[0.2em] uppercase">RECOVERY_EMAIL</span>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/20 to-transparent" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/40 w-4 h-4" />
                                <input
                                    type="email"
                                    placeholder="you@nebula.net"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={cn(
                                        "w-full bg-emerald-500/[0.03] border rounded-lg py-2 pl-10 pr-10 text-emerald-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30",
                                        emailCheckError ? "border-red-500/40" : "border-emerald-500/20 focus:border-emerald-400"
                                    )}
                                    required
                                    autoFocus
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isCheckingEmail && <Loader2 className="w-3 h-3 text-emerald-500/50 animate-spin" />}
                                    {emailRegistered === true && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                    {emailRegistered === false && <AlertCircle className="w-3 h-3 text-red-500/60" />}
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || emailRegistered === false}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-emerald-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "SENDING..." : "SEND OTP"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'forgot_otp' && (
                        <form onSubmit={handleForgotVerifyCode} className="space-y-4">
                            <div className="flex items-center gap-2 font-mono mb-2">
                                <div className="w-1.5 h-[1px] bg-emerald-500/80" />
                                <span className="text-[10px] font-bold text-emerald-300/80 tracking-[0.2em] uppercase">RECOVERY_CODE</span>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-emerald-500/20 to-transparent" />
                            </div>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-emerald-500/[0.03] border border-emerald-500/20 rounded-lg py-4 text-center text-3xl tracking-[0.5em] font-mono text-emerald-100 focus:outline-none focus:border-emerald-400 focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30"
                                maxLength={6}
                                required
                                autoFocus
                            />
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-emerald-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "VERIFYING..." : "VERIFY OTP"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'forgot_reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest ml-1 font-mono block">NEW PASSWORD</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/40 w-4 h-4" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-emerald-500/[0.03] border border-emerald-500/20 rounded-lg py-2 pl-10 pr-10 text-emerald-50 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-400 focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30"
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest ml-1 font-mono block flex items-center justify-between">
                                        CONFIRM PASSWORD
                                        {passwordsMatch && <Check size={10} className="text-green-400" />}
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/40 w-4 h-4" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={cn(
                                                "w-full bg-emerald-500/[0.03] border rounded-lg py-2 pl-10 pr-10 text-emerald-50 text-sm font-mono tracking-wider focus:outline-none focus:bg-emerald-500/[0.08] transition-all placeholder:text-emerald-800/30",
                                                confirmPassword && !passwordsMatch ? "border-red-500/40" : "border-emerald-500/20 focus:border-emerald-400"
                                            )}
                                            required
                                        />
                                        <button
                                            type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/40 hover:text-emerald-400 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* SECURITY RULES BOX */}
                            <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-3 space-y-2 relative overflow-hidden group/rules transition-all hover:bg-emerald-500/[0.05]">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck size={14} className="text-emerald-500/60" />
                                    <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest font-mono">Security Requirements</span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {[
                                        { label: '8+ characters', met: passwordRequirements.min8 },
                                        { label: 'Uppercase', met: passwordRequirements.hasUpper },
                                        { label: 'Lowercase', met: passwordRequirements.hasLower },
                                        { label: 'Number', met: passwordRequirements.hasNumber },
                                        { label: 'Special char', met: passwordRequirements.hasSpecial },
                                    ].map((req, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-2 transition-all duration-300",
                                            req.met ? "text-green-400 translate-x-1" : "text-emerald-500/60"
                                        )}>
                                            <div className={cn(
                                                "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                                                req.met ? "bg-green-500/20 border-green-500/50" : "border-emerald-500/20"
                                            )}>
                                                {req.met ? <Check size={10} className="stroke-[4]" /> : <div className="w-1 h-1 bg-current rounded-full" />}
                                            </div>
                                            <span className="text-[10px] font-mono tracking-tighter leading-none">{req.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || !isPasswordValid || !passwordsMatch}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-emerald-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "RESETTING..." : "CHANGE PASSWORD"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </>
    );
};
