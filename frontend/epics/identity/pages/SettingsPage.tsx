import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { profileApi } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Settings, Shield, Bell, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType } from "../types";
import { useToast } from "@/hooks/use-toast";

export const SettingsPage = () => {
    const { user: currentUser, updateUser, clearAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        display_name: "",
        bio: "",
        username: "",
        profile_visibility: "public" as "public" | "followers" | "private",
        location: "",
        website: "",
    });

    useEffect(() => {
        if (currentUser) {
            setFormData({
                display_name: currentUser.display_name || "",
                bio: currentUser.bio || "",
                username: currentUser.username || "",
                // @ts-ignore - handling potential mismatch in types
                profile_visibility: currentUser.profile_visibility || "public",
                location: currentUser.location || "",
                website: currentUser.website || "",
            });
        }
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        try {
            const response = await profileApi.updateProfile({
                display_name: formData.display_name,
                bio: formData.bio,
                profile_visibility: formData.profile_visibility as "public" | "followers",
            });

            if (response.data) {
                updateUser(response.data);
                toast({
                    title: "Profile updated",
                    description: "Your profile settings have been saved successfully.",
                });
            }
        } catch (error: any) {
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

    const navItems = [
        { id: "profile", label: "Profile", icon: User },
        { id: "account", label: "Account", icon: Settings },
        { id: "notifications", label: "Notifications", icon: Bell, disabled: true },
        { id: "privacy", label: "Privacy & Security", icon: Shield, disabled: true },
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
                                    <div className="mb-8 pb-6 border-b border-border/50">
                                        <h2 className="text-2xl font-bold mb-2">Profile Details</h2>
                                        <p className="text-muted-foreground">This information will be displayed publicly on your profile.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="display_name" className="text-base">Display Name</Label>
                                                <Input
                                                    id="display_name"
                                                    value={formData.display_name}
                                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                                    placeholder="Your name"
                                                    className="h-11 bg-secondary/30"
                                                />
                                                <p className="text-xs text-muted-foreground">The name that will be shown to other users.</p>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="username" className="text-base">Username</Label>
                                                <Input
                                                    id="username"
                                                    value={formData.username}
                                                    disabled
                                                    className="h-11 bg-secondary/50 opacity-70"
                                                />
                                                <p className="text-xs text-muted-foreground">Usernames cannot be changed freely.</p>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="bio" className="text-base">Bio</Label>
                                                <Textarea
                                                    id="bio"
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                    placeholder="Tell us a little about yourself"
                                                    className="min-h-[120px] bg-secondary/30 resize-none"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="visibility" className="text-base">Profile Visibility</Label>
                                                <Select
                                                    value={formData.profile_visibility}
                                                    onValueChange={(value: "public" | "followers" | "private") =>
                                                        setFormData({ ...formData, profile_visibility: value })
                                                    }
                                                >
                                                    <SelectTrigger className="h-11 bg-secondary/30">
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
                                                                <User className="w-4 h-4" />
                                                                <span>Followers Only</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="private">
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="w-4 h-4" />
                                                                <span>Private</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-border/50 flex items-center justify-end gap-4">
                                            <Button type="button" variant="ghost" onClick={() => window.history.back()}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={loading} className="min-w-[120px]">
                                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Save Changes
                                            </Button>
                                        </div>
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
                                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-destructive text-lg">Deactivate Account</h3>
                                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                                        Deactivating your account will hide your profile and all your content from other users.
                                                        You can reactivate your account at any time by logging back in.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex justify-end">
                                                <Button
                                                    variant="destructive"
                                                    onClick={handleDeactivate}
                                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                                >
                                                    Deactivate My Account
                                                </Button>
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

function GlobeIcon(props: any) {
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
