import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi, authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { UpdateProfileRequest, ChangePasswordRequest, ActivityLog } from '../types';
import './Profile.css';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser, clearAuth } = useAuthStore();

    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Profile state
    const [profileData, setProfileData] = useState<UpdateProfileRequest>({
        display_name: user?.display_name || '',
        bio: user?.bio || '',
        avatar_url: user?.avatar_url || '',
        profile_visibility: user?.profile_visibility || 'public',
    });

    // Password state
    const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
        old_password: '',
        new_password: '',
    });
    const [confirmPassword, setConfirmPassword] = useState('');

    // Activity state
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        if (activeTab === 'activity') {
            loadActivity();
        }
    }, [activeTab]);

    const loadActivity = async () => {
        try {
            const data = await profileApi.getActivity(50);
            setActivities(data);
        } catch (err) {
            setError('Failed to load activity');
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await profileApi.updateProfile(profileData);
            if (response.data) {
                updateUser(response.data);
            }
            setMessage('Profile updated successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (passwordData.new_password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordData.new_password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            await authApi.changePassword(passwordData);
            setMessage('Password changed successfully! Please log in again.');
            setPasswordData({ old_password: '', new_password: '' });
            setConfirmPassword('');

            // Logout after password change
            setTimeout(() => {
                handleLogout();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
            return;
        }

        try {
            await profileApi.deactivateAccount();
            clearAuth();
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to deactivate account');
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Ignore errors
        }
        clearAuth();
        navigate('/login');
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>My Profile</h1>
                <button onClick={handleLogout} className="btn-secondary">
                    Logout
                </button>
            </div>

            <div className="profile-tabs">
                <button
                    className={activeTab === 'profile' ? 'tab-active' : ''}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={activeTab === 'security' ? 'tab-active' : ''}
                    onClick={() => setActiveTab('security')}
                >
                    Security
                </button>
                <button
                    className={activeTab === 'activity' ? 'tab-active' : ''}
                    onClick={() => setActiveTab('activity')}
                >
                    Activity
                </button>
            </div>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {activeTab === 'profile' && (
                <div className="tab-content">
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="display_name">Display Name</label>
                            <input
                                type="text"
                                id="display_name"
                                value={profileData.display_name}
                                onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio">Bio</label>
                            <textarea
                                id="bio"
                                value={profileData.bio}
                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                rows={4}
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="avatar_url">Avatar URL</label>
                            <input
                                type="url"
                                id="avatar_url"
                                value={profileData.avatar_url}
                                onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="visibility">Profile Visibility</label>
                            <select
                                id="visibility"
                                value={profileData.profile_visibility}
                                onChange={(e) =>
                                    setProfileData({
                                        ...profileData,
                                        profile_visibility: e.target.value as 'public' | 'followers',
                                    })
                                }
                            >
                                <option value="public">Public</option>
                                <option value="followers">Followers Only</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                    </form>

                    <div className="danger-zone">
                        <h3>Danger Zone</h3>
                        <button onClick={handleDeactivate} className="btn-danger">
                            Deactivate Account
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="tab-content">
                    <form onSubmit={handlePasswordChange} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="old_password">Current Password</label>
                            <input
                                type="password"
                                id="old_password"
                                value={passwordData.old_password}
                                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new_password">New Password</label>
                            <input
                                type="password"
                                id="new_password"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm_password">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirm_password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="tab-content">
                    <h2>Recent Activity</h2>
                    {activities.length === 0 ? (
                        <p>No activity yet</p>
                    ) : (
                        <div className="activity-list">
                            {activities.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">
                                        {activity.action === 'login' && '🔐'}
                                        {activity.action === 'logout' && '🚪'}
                                        {activity.action === 'profile_update' && '✏️'}
                                        {activity.action === 'password_change' && '🔑'}
                                        {activity.action === 'signup' && '✨'}
                                    </div>
                                    <div className="activity-details">
                                        <strong>{activity.action.replace('_', ' ').toUpperCase()}</strong>
                                        <p>{activity.details}</p>
                                        <small>{new Date(activity.timestamp).toLocaleString()}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
