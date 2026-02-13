import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { profileApi, authApi } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Settings, Shield, Bell, Lock, AlertTriangle, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType, ActivityLog } from "../types";
import { useToast } from "@/hooks/use-toast";

// SettingsPage manages user account preferences
// It includes tabs for:
// 1. Profile: Edit display name, bio, etc.
// 2. Account: Activity logs, Deactivation, Deletion
// 3. Privacy & Security: Password change, 2FA toggle
export const SettingsPage = () => {
    const { user: currentUser, updateUser, clearAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        display_name: "",
        bio: "",
        username: "",
        profile_visibility: "public" as "public" | "followers",
        location: "",
        website: "",
        is_discoverable: false,
    });

    const [passwordData, setPasswordData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [passwordLoading, setPasswordLoading] = useState(false);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    const handleToggle2FA = async (checked: boolean) => {
        try {
            await authApi.toggle2FA(checked);
            setIs2FAEnabled(checked);
            toast({
                title: checked ? "2FA Enabled" : "2FA Disabled",
                description: checked
                    ? "Two-factor authentication has been enabled for your account."
                    : "Two-factor authentication has been disabled.",
            });
            // Update local user state if needed
            if (currentUser) {
                updateUser({ ...currentUser, is_2fa_enabled: checked } as UserType);
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to update 2FA settings",
                variant: "destructive",
            });
            // Revert switch state on error (optional, but good UX)
            setIs2FAEnabled(!checked);
        }
    };

    const handleToggleDiscovery = async (checked: boolean) => {
        const message = checked
            ? "Are you sure you want to enable Global Directory Visibility? Your profile will be listed in the public directory and discoverable by users from ALL connected communities."
            : "Are you sure you want to disable Global Directory Visibility? Your profile will be removed from the public directory and users from other communities won't be able to find you.";

        if (!window.confirm(message)) {
            // Revert the visual state if the user cancels (handled by not updating state)
            return;
        }

        setFormData({ ...formData, is_discoverable: checked });
        try {
            const response = await profileApi.updateProfile({
                ...formData,
                is_discoverable: checked
            });
            if (response.data) {
                updateUser(response.data);
                toast({
                    title: checked ? "Discovery Enabled" : "Discovery Disabled",
                    description: checked ? "Your profile is now visible in the global directory." : "Your profile is now hidden from the global directory.",
                });
            }
        } catch (error: any) {
            console.error(error);
            setFormData({ ...formData, is_discoverable: !checked }); // Revert on error
            toast({
                title: "Error",
                description: "Failed to update discovery settings",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        if (currentUser) {
            setFormData({
                display_name: currentUser.display_name || "",
                bio: currentUser.bio || "",
                username: currentUser.username || "",
                profile_visibility: (currentUser.profile_visibility || "public") as "public" | "followers",
                location: currentUser.location || "",
                website: currentUser.website || "",
                is_discoverable: currentUser.is_discoverable || false,
            });
            setIs2FAEnabled((currentUser as UserType & { is_2fa_enabled?: boolean }).is_2fa_enabled || false);
        }
    }, [currentUser]);

    // Fetch activity logs
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [showActivity, setShowActivity] = useState(false);

    useEffect(() => {
        const loadActivity = async () => {
            if (activeTab === "account") {
                try {
                    const data = await profileApi.getActivity(10);
                    setActivities(data);
                } catch (error) {
                    console.error("Failed to load activity", error);
                }
            }
        };
        loadActivity();
    }, [activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        // Space validation for username
        if (formData.username.includes(" ")) {
            toast({
                title: "Invalid Username",
                description: "Username cannot contain spaces.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await profileApi.updateProfile({
                username: formData.username,
                display_name: formData.display_name,
                bio: formData.bio,
                profile_visibility: formData.profile_visibility as "public" | "followers",
                is_discoverable: formData.is_discoverable,
            });

            if (response.data) {
                updateUser(response.data);
                toast({
                    title: "Profile updated",
                    description: "Your profile settings have been saved successfully.",
                });
                setIsEditing(false);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        if (window.confirm("Are you sure you want to deactivate your account? This action cannot be undone.")) {
            try {
                await profileApi.deactivateAccount();
                clearAuth();
                window.location.href = "/login";
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.response?.data?.message || "Failed to deactivate account",
                    variant: "destructive",
                });
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("ARE YOU ABSOLUTELY SURE? This action CANNOT be undone. This will permanently delete your account and remove all your data.")) {
            try {
                await profileApi.deleteAccount();
                clearAuth();
                window.location.href = "/login";
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete account",
                    variant: "destructive",
                });
            }
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast({
                title: "Error",
                description: "New passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (passwordData.new_password.length < 8) {
            toast({
                title: "Error",
                description: "Password must be at least 8 characters long",
                variant: "destructive",
            });
            return;
        }

        setPasswordLoading(true);
        try {
            await authApi.changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
            });

            toast({
                title: "Success",
                description: "Password changed successfully. Please log in again.",
            });

            // Clear password data
            setPasswordData({
                old_password: "",
                new_password: "",
                confirm_password: "",
            });

            // Logout after a delay
            setTimeout(() => {
                clearAuth();
            }, 2000);
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to change password",
                variant: "destructive",
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    const navItems = [
        { id: "profile", label: "Profile", icon: User },
        { id: "account", label: "Account", icon: Settings },
        { id: "notifications", label: "Notifications", icon: Bell, disabled: true },
        { id: "privacy", label: "Privacy & Security", icon: Shield, disabled: false },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Header */}
            <div className="h-48 bg-gradient-to-br from-primary/10 via-secondary/10 to-background border-b border-border/50 relative overflow-hidden">
                <div className="absolute inset-0 grid-pattern opacity-10" />
                <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                    <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Settings</h1>
                    <p className="text-muted-foreground text-lg">Manage your account preferences and profile details</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-3">
                        <div className="glass-card rounded-2xl p-2 sticky top-24 space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => !item.disabled && setActiveTab(item.id)}
                                    disabled={item.disabled}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                                        activeTab === item.id
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : item.disabled
                                                ? "opacity-50 cursor-not-allowed text-muted-foreground hover:bg-transparent"
                                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-9">
                        <div className="glass-card rounded-3xl p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 bg-card/50 backdrop-blur-xl border border-border/50">
                            {activeTab === "profile" && (
                                <div className="max-w-2xl">
                                    <div className="mb-8 pb-6 border-b border-border/50 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">Profile Details</h2>
                                            <p className="text-muted-foreground">This information will be displayed publicly on your profile.</p>
                                        </div>
                                        {!isEditing && (
                                            <Button
                                                onClick={() => setIsEditing(true)}
                                                variant="outline"
                                                className="gap-2"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit Profile
                                            </Button>
                                        )}
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="display_name" className="text-base">Display Name</Label>
                                                <Input
                                                    id="display_name"
                                                    value={formData.display_name}
                                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                                    placeholder="Your name"
                                                    disabled={!isEditing}
                                                    className={cn(
                                                        "h-11 transition-all duration-200",
                                                        isEditing
                                                            ? "bg-background border-primary/20 focus:border-primary shadow-sm"
                                                            : "bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground cursor-not-allowed"
                                                    )}
                                                />
                                                <p className="text-xs text-muted-foreground">The name that will be shown to other users.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="username" className="text-base">Username</Label>
                                                <Input
                                                    id="username"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    disabled={!isEditing}
                                                    className={cn(
                                                        "h-11 transition-all duration-200",
                                                        isEditing
                                                            ? "bg-background border-primary/20 focus:border-primary shadow-sm"
                                                            : "bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground cursor-not-allowed"
                                                    )}
                                                />
                                                <p className="text-xs text-muted-foreground">Usernames cannot contain spaces.</p>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="bio" className="text-base">Bio</Label>
                                                <Textarea
                                                    id="bio"
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                    placeholder="Tell us a little about yourself"
                                                    disabled={!isEditing}
                                                    className={cn(
                                                        "min-h-[120px] transition-all duration-200 resize-none",
                                                        isEditing
                                                            ? "bg-background border-primary/20 focus:border-primary shadow-sm"
                                                            : "bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground cursor-not-allowed"
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-1">
                                                <Label htmlFor="visibility" className="text-base">Profile Visibility</Label>
                                                <Select
                                                    value={formData.profile_visibility}
                                                    disabled={!isEditing}
                                                    onValueChange={(value: "public" | "followers") =>
                                                        setFormData({ ...formData, profile_visibility: value })
                                                    }
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-11 transition-all duration-200",
                                                        isEditing
                                                            ? "bg-background border-primary/20"
                                                            : "bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground cursor-not-allowed"
                                                    )}>
                                                        <SelectValue placeholder="Select visibility" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="public">
                                                            <div className="flex items-center gap-2">
                                                                <GlobeIcon className="w-4 h-4" />
                                                                <span>Public</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="followers">
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="w-4 h-4" />
                                                                <span>Private</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <div className="p-4 rounded-xl border border-border/50 bg-secondary/10 flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-base flex items-center gap-2">
                                                            <GlobeIcon className="w-4 h-4 text-primary" />
                                                            Global Directory Visibility
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            Allow your profile to be listed in the public directory and discoverable by users from other communities.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.is_discoverable}
                                                        onCheckedChange={handleToggleDiscovery}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="pt-6 border-t border-border/50 flex items-center justify-end gap-4">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        // Reset form data to current user info
                                                        if (currentUser) {
                                                            setFormData({
                                                                display_name: currentUser.display_name || "",
                                                                bio: currentUser.bio || "",
                                                                username: currentUser.username || "",
                                                                profile_visibility: (currentUser.profile_visibility || "public") as "public" | "followers",
                                                                location: currentUser.location || "",
                                                                website: currentUser.website || "",
                                                                is_discoverable: currentUser.is_discoverable || false,
                                                            });
                                                        }
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={loading} className="min-w-[120px]">
                                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Save Changes
                                                </Button>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}

                            {activeTab === "account" && (
                                <div className="max-w-2xl">
                                    <div className="mb-8 pb-6 border-b border-border/50">
                                        <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
                                        <p className="text-muted-foreground">Manage your account access and deletion.</p>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Activity Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-lg">Recent User Activity</h3>
                                                <Button
                                                    onClick={() => setShowActivity(!showActivity)}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    {showActivity ? "Hide Activity" : "View Activity"}
                                                </Button>
                                            </div>

                                            {showActivity && (
                                                <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                                    {activities.length === 0 ? (
                                                        <div className="p-8 text-center border rounded-xl bg-secondary/20">
                                                            <p className="text-muted-foreground">No recent activity found.</p>
                                                        </div>
                                                    ) : (
                                                        activities.map((activity, index) => (
                                                            <div
                                                                key={activity.id}
                                                                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50"
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                                                                    {activity.action === 'login' && '🔐'}
                                                                    {activity.action === 'logout' && '🚪'}
                                                                    {activity.action === 'profile_update' && '✏️'}
                                                                    {activity.action === 'password_change' && '🔑'}
                                                                    {activity.action === 'signup' && '✨'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary truncate pr-2">
                                                                            {activity.action.replace('_', ' ')}
                                                                        </h4>
                                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                            {new Date(activity.timestamp).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-foreground/80 truncate">{activity.details}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            {/* Deactivate Section */}
                                            <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/10 p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full shrink-0">
                                                        <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-orange-700 dark:text-orange-400 text-lg">Deactivate Account</h3>
                                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                                            Deactivating your account will hide your profile and all your content from other users.
                                                            You will need to contact support to reactivate your account.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleDeactivate}
                                                        className="border-orange-200 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                                                    >
                                                        Deactivate My Account
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Delete Section */}
                                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                                                        <AlertTriangle className="w-6 h-6 text-destructive" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-destructive text-lg">Delete Account</h3>
                                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                                            Permanently delete your account and all associated data. This action cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex justify-end">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleDeleteAccount}
                                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                                    >
                                                        Delete Permanently
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "privacy" && (
                                <div className="max-w-2xl">
                                    <div className="mb-8 pb-6 border-b border-border/50">
                                        <h2 className="text-2xl font-bold mb-2">Privacy & Security</h2>
                                        <p className="text-muted-foreground">Manage your password and security settings.</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                <Lock className="w-5 h-5 text-primary" />
                                                Change Password
                                            </h3>

                                            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="old_password">Current Password</Label>
                                                    <Input
                                                        id="old_password"
                                                        type="password"
                                                        value={passwordData.old_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                        placeholder="Enter current password"
                                                        className="h-11 bg-secondary/30"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="new_password">New Password</Label>
                                                    <Input
                                                        id="new_password"
                                                        type="password"
                                                        value={passwordData.new_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                        placeholder="Enter new password"
                                                        className="h-11 bg-secondary/30"
                                                        required
                                                    />
                                                    <p className="text-xs text-muted-foreground">Password must be at least 8 characters long.</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                                                    <Input
                                                        id="confirm_password"
                                                        type="password"
                                                        value={passwordData.confirm_password}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                        placeholder="Confirm new password"
                                                        className="h-11 bg-secondary/30"
                                                        required
                                                    />
                                                </div>

                                                <div className="pt-4 border-t border-border/50 flex justify-end">
                                                    <Button type="submit" disabled={passwordLoading} className="min-w-[150px]">
                                                        {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Update Password
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>

                                        <div className="pt-8 border-t border-border/50">
                                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-primary" />
                                                Security Preferences
                                            </h3>
                                            <div className="p-6 rounded-2xl border border-border/50 bg-secondary/10 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold mb-1">Two-Factor Authentication</h4>
                                                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("text-sm font-medium transition-colors", is2FAEnabled ? "text-primary" : "text-muted-foreground")}>
                                                        {is2FAEnabled ? "Enabled" : "Disabled"}
                                                    </span>
                                                    <Switch
                                                        checked={is2FAEnabled}
                                                        onCheckedChange={handleToggle2FA}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" x2="22" y1="12" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
}
