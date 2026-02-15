import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authApi } from '../api/client';
import { ArrowLeft, Loader2, KeyRound, Mail, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }

        setIsLoading(true);
        try {
            await authApi.forgotPassword(email);
            toast.success("If an account exists, a code has been sent.");
            setStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setIsLoading(true);
        try {
            await authApi.verifyResetCode({ email, code: otp });
            toast.success("Code verified successfully");
            setStep(3);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Invalid or expired code");
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
        try {
            await authApi.resetPassword({ email, code: otp, new_password: newPassword });
            toast.success("Password reset successfully! Please login.");
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background">
            <div className="absolute top-4 left-4 md:top-8 md:left-8">
                <Button 
                    variant="ghost" 
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/login')}
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Button>
            </div>

            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                        <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {step === 1 ? "Forgot Password?" : (step === 2 ? "Verify Email" : "Reset Password")}
                    </h1>
                    <p className="text-muted-foreground">
                        {step === 1 
                            ? "Enter your email address and we'll send you a verification code." 
                            : (step === 2 
                                ? "Enter the code sent to your email." 
                                : "Create a new password for your account.")}
                    </p>
                </div>

                <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
                    {step === 1 && (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Code...
                                    </>
                                ) : (
                                    "Send Verification Code"
                                )}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyCode} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="otp"
                                        placeholder="Enter the 6-digit code"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="pl-10 tracking-widest font-mono"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify Code"
                                )}
                            </Button>
                            
                            <Button 
                                type="button" 
                                variant="ghost" 
                                className="w-full text-xs text-muted-foreground"
                                onClick={() => setStep(1)}
                            >
                                Didn't verify? Change email
                            </Button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        minLength={8}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
