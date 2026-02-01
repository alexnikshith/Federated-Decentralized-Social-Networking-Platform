import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest } from '../types';
import './Auth.css';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
    });
    const [step, setStep] = useState(1); // 1: Login, 2: OTP
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (step === 1) {
                // Step 1: Initiate Login
                const response = await authApi.login(formData);
                if (response.token) {
                    // Direct login (2FA disabled)
                    setAuth(response.user, response.token);
                    navigate('/dashboard');
                } else {
                    // 2FA enabled
                    setStep(2);
                }
            } else {
                // Step 2: Verify OTP
                const response = await authApi.verifyOTP({ email: formData.email, code: otp });
                setAuth(response.user, response.token);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>{step === 1 ? 'Welcome Back' : 'Verify Identity'}</h1>
                    <p>{step === 1 ? 'Sign in to your federated account' : `Enter the code sent to ${formData.email}`}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="error-message">{error}</div>}

                    {step === 1 ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="otp">Verification Code</label>
                            <input
                                type="text"
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                placeholder="000000"
                                maxLength={6}
                                className="otp-input"
                            />
                            <button
                                type="button"
                                className="back-link"
                                onClick={() => setStep(1)}
                            >
                                Back to login
                            </button>
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : (step === 1 ? 'Sign In' : 'Verify Code')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account? <Link to="/signup">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
