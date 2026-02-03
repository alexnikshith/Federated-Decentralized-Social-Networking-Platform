import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User } from '../../identity/types';
import { adminApi } from '../api/adminApi';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ManageUserModalProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const ManageUserModal: React.FC<ManageUserModalProps> = ({ user, open, onClose, onUpdate }) => {
    const [role, setRole] = useState<string>(user?.role || 'user');
    const [loading, setLoading] = useState(false);

    // Update local state when user changes
    React.useEffect(() => {
        if (user) {
            setRole(user.role || 'user');
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await adminApi.updateUserRole(user.id, role);
            toast.success(`Role updated successfully for @${user.username}`);
            toast.info(`A notification email has been sent to ${user.email}`);
            onUpdate();
            onClose();
        } catch (error) {
            toast.error('Failed to update user role');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/40">
                <DialogHeader>
                    <DialogTitle>Manage User Permissions</DialogTitle>
                    <DialogDescription>
                        Update account settings and roles for this user.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* User Info Header */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/40">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-semibold text-base">{user.display_name}</span>
                            <span className="text-sm text-muted-foreground italic">@{user.username}</span>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="ml-auto">
                            {user.role || 'user'}
                        </Badge>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">Assign Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger id="role" className="bg-background/50 border-border/40">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Standard User</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Administrators have full access to the control center and moderation tools.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Account Status</Label>
                        <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border/40">
                            <span className="text-sm">Registration Date</span>
                            <span className="text-sm font-medium">
                                {user.created_at ? new Date(user.created_at as string).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading || role === user.role} variant="hero">
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ManageUserModal;
