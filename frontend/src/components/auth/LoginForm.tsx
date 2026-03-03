import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Orbit, ChevronLeft, Globe, ArrowRight, Eye, EyeOff, Shield, KeyRound, Mail, CheckCircle2, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
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
    const { user, setAuth, isLoginExiting, setLoginExiting, startNebulaTransition } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false);
    // Default to stored instance or Default Community
    const [instance, setInstance] = useState(
        localStorage.getItem('active_community_url') || DEFAULT_COMMUNITY.url
    );
    const [email, setEmail] = useState("");
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

    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for Views
    const [view, setView] = useState<'login' | 'login_otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('login');
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

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
                                if (view === 'login') navigate('/');
                                else setView('login');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500/60 hover:text-amber-500 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group active:scale-95"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[10px] font-mono tracking-[0.2em] font-bold uppercase">BACK</span>
                        </button>
                    </div>
                )
            }

            <div className="w-full max-w-[880px] mx-auto grid grid-cols-2 gap-x-12 items-center px-10 pt-14 pb-6 h-full relative z-40">
                {/* Decoration corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-500/40 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-500/40 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-500/40 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-500/40 rounded-br-2xl" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,146,0,0.5) 1px, transparent 1px)', backgroundSize: '100% 3px' }} />

                {/* Left Column: Heading & Info */}
                <motion.div
                    className="text-left space-y-6 flex flex-col justify-center h-full"
                    initial={{ opacity: 1, x: 0 }}
                    animate={isLoginExiting ? { opacity: 0, x: -200 } : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                >
                    <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2">
                        <h1 className="text-lg font-bold text-amber-500 tracking-[0.4em] uppercase font-mono">
                            {view === 'login' && "Welcome back"}
                            {view === 'login_otp' && "Verify Identity"}
                            {view === 'forgot_email' && "Recovery"}
                            {view === 'forgot_otp' && "Verify Recovery"}
                            {view === 'forgot_reset' && "Reset Protocol"}
                        </h1>
                        <div className="text-xs font-mono text-amber-500/40">[ AUTH_PHASE ]</div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-mono text-amber-400/80 leading-relaxed tracking-wider">
                            {view === 'login' && "Initialize secure connection to your community. Credentials required for login."}
                            {view === 'login_otp' && `A 6-digit verification code has been sent to ${email}. Submit code to authorize access.`}
                            {view === 'forgot_email' && "Submit your registered email to receive recovery instructions."}
                            {view === 'forgot_otp' && `Submit the recovery code sent to your terminal.`}
                            {view === 'forgot_reset' && "Establish a new high-entropy password for your account."}
                        </p>
                    </div>

                    <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-4 flex items-center gap-3">
                        <Shield className="w-5 h-5 text-amber-500/60" />
                        <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest leading-none">Quantum-encrypted end-to-handshake tunnel active</span>
                    </div>
                </motion.div>

                {/* Right Column: Form */}
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={isLoginExiting ? { opacity: 0, x: 200 } : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                    className="relative w-full z-10 space-y-4"
                >
                    {error && (
                        <div className="px-3 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-[10px] font-mono flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}

                    {/* -- LOGIN VIEWS -- */}
                    {(view === 'login' || view === 'login_otp') && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            {view === 'login' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 font-mono mb-2">
                                            <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                            <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">NEURAL NODE</span>
                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                                        </div>
                                        <Select value={instance} onValueChange={setInstance}>
                                            <SelectTrigger className="w-full bg-amber-500/[0.03] border-amber-500/20 h-10 text-amber-50 font-mono text-sm focus:ring-0 focus:ring-offset-0 focus:border-amber-400">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5 text-amber-500/40" />
                                                    <SelectValue placeholder="Select node" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-amber-950 border-amber-500/20 text-amber-100 font-mono">
                                                {COMMUNITIES.map((community) => (
                                                    <SelectItem key={community.id} value={community.url} className="focus:bg-amber-500/20 focus:text-amber-100 cursor-pointer">
                                                        <span className="text-xs">{community.name}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">EMAIL</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/40 w-4 h-4" />
                                            <input
                                                type="email"
                                                placeholder="you@nebula.net"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-10 pr-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest font-mono">PASSWORD</label>
                                            <button
                                                type="button"
                                                onClick={() => setView('forgot_email')}
                                                className="text-[10px] font-mono text-amber-300 hover:text-amber-400 transition-colors uppercase tracking-widest"
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
                                                className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-3 pr-10 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/40 hover:text-amber-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 font-mono mb-2">
                                        <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                        <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">VERIFICATION_CODE</span>
                                        <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-4 text-center text-3xl tracking-[0.5em] font-mono text-amber-100 focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            className="text-[10px] font-mono text-amber-500/40 hover:text-amber-400 transition-colors uppercase tracking-widest"
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
                                    disabled={isLoading}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3">
                                        {isLoading ? "PROCESSING..." : (
                                            <>
                                                {view === 'login' ? "LOGIN" : "VERIFY_CODE"}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                </button>
                            </div>

                            {view === 'login' && (
                                <div className="pt-2">
                                    <p className="text-center text-[10px] text-amber-500/40 font-mono tracking-[0.2em] uppercase">
                                        UNAUTHORIZED? {onSwitchToRegister ? (
                                            <button onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }} className="text-amber-400 font-bold hover:text-amber-200 transition-colors">REGISTER</button>
                                        ) : (
                                            <Link to="/register" className="text-amber-400 font-bold hover:text-amber-200 transition-colors">REGISTER</Link>
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
                                <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">RECOVERY_EMAIL</span>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/40 w-4 h-4" />
                                <input
                                    type="email"
                                    placeholder="you@nebula.net"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-10 pr-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "SENDING..." : "SEND OTP"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                </button>
                            </div>
                            <div className="text-center">
                                <button
                                    type="button"
                                    className="text-[10px] font-mono text-amber-500/40 hover:text-amber-400 transition-colors uppercase tracking-widest"
                                    onClick={() => setView('login')}
                                >
                                    &larr; BACK TO LOGIN
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'forgot_otp' && (
                        <form onSubmit={handleForgotVerifyCode} className="space-y-4">
                            <div className="flex items-center gap-2 font-mono mb-2">
                                <div className="w-1.5 h-[1px] bg-amber-500/80" />
                                <span className="text-[10px] font-bold text-amber-300/80 tracking-[0.2em] uppercase">RECOVERY_CODE</span>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-500/20 to-transparent" />
                            </div>
                            <input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-4 text-center text-3xl tracking-[0.5em] font-mono text-amber-100 focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
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
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "VERIFYING..." : "VERIFY OTP"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'forgot_reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">NEW PASSWORD</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/40 w-4 h-4" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-10 pr-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                            required
                                            minLength={8}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-amber-500/60 uppercase tracking-widest ml-1 font-mono block">CONFIRM PASSWORD</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/40 w-4 h-4" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-amber-500/[0.03] border border-amber-500/20 rounded-lg py-2 pl-10 pr-3 text-amber-50 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:bg-amber-500/[0.08] transition-all placeholder:text-amber-800/30"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full relative group/btn py-3 overflow-hidden text-center disabled:opacity-40"
                                >
                                    <span className="relative z-10 font-mono text-sm font-bold tracking-[0.4em] text-amber-100 flex items-center justify-center gap-3 uppercase">
                                        {isLoading ? "RESETTING..." : "CHANGE PASSWORD"}
                                    </span>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </>
    );
};
