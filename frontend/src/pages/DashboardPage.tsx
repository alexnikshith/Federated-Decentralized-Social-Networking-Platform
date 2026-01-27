import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../epics/identity/store/authStore';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <h2>Federated Social</h2>
                </div>
                <div className="nav-links">
                    <Link to="/dashboard" className="nav-link active">
                        Dashboard
                    </Link>
                    <Link to="/profile" className="nav-link">
                        Profile
                    </Link>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-section">
                    <h1>Welcome back, {user?.display_name || user?.username}! 👋</h1>
                    <p>You're successfully logged into your federated social network account.</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card featured">
                        <div className="stat-icon">📱</div>
                        <div className="stat-info">
                            <h3>Feed</h3>
                            <p>View posts, like, and comment</p>
                            <Link to="/feed" className="stat-link">
                                Go to Feed →
                            </Link>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">👤</div>
                        <div className="stat-info">
                            <h3>Profile</h3>
                            <p>Manage your account</p>
                            <Link to="/profile" className="stat-link">
                                Go to Profile →
                            </Link>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">🔒</div>
                        <div className="stat-info">
                            <h3>Privacy</h3>
                            <p>Your profile is {user?.profile_visibility}</p>
                            <Link to="/profile" className="stat-link">
                                Change Settings →
                            </Link>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <h3>Activity</h3>
                            <p>View your recent actions</p>
                            <Link to="/profile" className="stat-link">
                                View Activity →
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="info-section">
                    <h2>Epic 1: Identity - Completed ✅</h2>
                    <div className="feature-list">
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.1: Account Creation</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.2: Secure Login</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.3: Profile Editing</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.4: Privacy Controls</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.5: Account Deactivation</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.6: Password Change</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.7: Activity Logs</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US1.8: Secure Logout</span>
                        </div>
                    </div>
                </div>

                <div className="info-section">
                    <h2>Epic 2: Content Sharing - Completed ✅</h2>
                    <div className="feature-list">
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.1: Create Posts</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.2: View Feed</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.3: Like Posts</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.4: Comment on Posts</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.5: Delete Posts</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.6: Follow Users</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.7: Notifications</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-check">✓</span>
                            <span>US2.8: Search Users</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
