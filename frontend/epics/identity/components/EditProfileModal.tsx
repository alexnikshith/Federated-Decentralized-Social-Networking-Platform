import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { profileApi } from "../api/client";
import type { User } from "../types";

interface EditProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User;
    onProfileUpdated: (updatedUser: User) => void;
}

export const EditProfileModal = ({
    open,
    onOpenChange,
    user,
    onProfileUpdated,
}: EditProfileModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: user.username,
        display_name: user.display_name || "",
        bio: user.bio || "",
        profile_visibility: user.profile_visibility || "public",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await profileApi.updateProfile(formData);
            if (response.data) {
                onProfileUpdated(response.data);
                onOpenChange(false);
            } else {
                setError("Failed to update profile: No data returned");
            }
        } catch (error) {
            setError(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({ ...formData, username: e.target.value })
                            }
                            placeholder="username"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                            id="display_name"
                            value={formData.display_name}
                            onChange={(e) =>
                                setFormData({ ...formData, display_name: e.target.value })
                            }
                            placeholder="Your Name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) =>
                                setFormData({ ...formData, bio: e.target.value })
                            }
                            placeholder="Tell us about yourself..."
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="visibility">Profile Visibility</Label>
                        <Select
                            value={formData.profile_visibility}
                            onValueChange={(value) =>
                                setFormData({ ...formData, profile_visibility: value as User['profile_visibility'] })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="followers">Followers Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
