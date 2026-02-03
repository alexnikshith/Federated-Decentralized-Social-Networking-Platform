import React from 'react';
import { User } from '../../identity/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCog, Ban, CheckCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import ManageUserModal from './ManageUserModal';
import { useAuthStore } from '../../identity/store/authStore';
import { cn } from '@/lib/utils';

interface UserManagementProps {
    users: User[];
    loading: boolean;
    onToggleStatus: (userId: string, currentStatus: boolean) => void;
    onRefresh: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, loading, onToggleStatus, onRefresh }) => {
    const { user: currentUser } = useAuthStore();
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleOpenSettings = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    // Separate current user from the rest
    const selfUser = users.find(u => u.id === currentUser?.id);
    const otherUsers = users.filter(u => u.id !== currentUser?.id);

    const renderUserRow = (user: User, isSelf: boolean = false) => (
        <TableRow key={user.id} className={cn(
            "hover:bg-muted/30 transition-colors",
            isSelf && "bg-primary/5 hover:bg-primary/10"
        )}>
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{user.display_name}</span>
                            {isSelf && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary border-none">
                                    YOU
                                </Badge>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-sm">{user.email || 'N/A'}</TableCell>
            <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {user.role || 'user'}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant={!user.is_active ? 'destructive' : 'outline'} className="flex w-fit items-center gap-1">
                    {!user.is_active ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                    {!user.is_active ? 'Banned' : 'Active'}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                {!isSelf ? (
                    <TooltipProvider>
                        <div className="flex justify-end gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onToggleStatus(user.id, user.is_active || false)}
                                        className={user.is_active ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-green-500 hover:text-green-500 hover:bg-green-500/10"}
                                    >
                                        {user.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{user.is_active ? 'Ban User' : 'Enable User'}</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenSettings(user)}>
                                        <UserCog className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Manage Permissions</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                ) : (
                    <span className="text-xs text-muted-foreground px-2">Account Protected</span>
                )}
            </TableCell>
        </TableRow>
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[250px]">User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5} className="h-16 animate-pulse bg-muted/20" />
                                </TableRow>
                            ))
                        ) : (
                            <>
                                {/* Personal Account Section Header */}
                                {selfUser && (
                                    <>
                                        {renderUserRow(selfUser, true)}
                                        {otherUsers.length > 0 && (
                                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                                                <TableCell colSpan={5} className="py-2 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    Platform Users
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}

                                {otherUsers.map(user => renderUserRow(user, false))}
                            </>
                        )}
                    </TableBody>
                </Table>

                <ManageUserModal
                    user={selectedUser}
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={onRefresh}
                />
            </div>
        </div>
    );
};

export default UserManagement;
