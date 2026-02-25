import React from 'react';
import { User } from '../../identity/types';
import { AdminStats } from '../types';
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
import { UserCog, Ban, CheckCircle, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    stats: AdminStats | null;
    loading: boolean;
    onToggleStatus: (userId: string, currentStatus: boolean) => void;
    onDeleteUser: (userId: string) => void;
    onRefresh: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, stats, loading, onToggleStatus, onDeleteUser, onRefresh }) => {
    const { user: currentUser } = useAuthStore();
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    // Search and Sort State
    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState<'alphabetical' | 'newest' | 'oldest'>('alphabetical');

    const handleOpenSettings = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    // Filter and Sort users
    let filteredUsers = [...users];

    if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter(u =>
            u.username.toLowerCase().includes(lowerQuery) ||
            (u.display_name && u.display_name.toLowerCase().includes(lowerQuery)) ||
            (u.email && u.email.toLowerCase().includes(lowerQuery))
        );
    }

    const sortedUsers = filteredUsers.sort((a, b) => {
        if (sortOrder === 'alphabetical') {
            const nameA = (a.display_name || a.username).toLowerCase();
            const nameB = (b.display_name || b.username).toLowerCase();
            return nameA.localeCompare(nameB);
        } else {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        }
    });

    const admins = sortedUsers.filter(u => u.role === 'admin');
    const standardUsers = sortedUsers.filter(u => u.role !== 'admin');

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
            <TableCell className="text-sm">
                {user.created_at ? new Date(user.created_at as string).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
            </TableCell>
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
                                    {user.is_active ? (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Ban User @{user.username}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will prevent the user from logging in and interacting with the platform. You can re-enable their account at any time.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => onToggleStatus(user.id, true)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Deactivate Account
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onToggleStatus(user.id, false)}
                                            className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                        </Button>
                                    )}
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

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete <span className="font-bold">@{user.username}</span> and all associated data including posts, follows, and activity logs. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDeleteUser(user.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Delete User Account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TooltipProvider>
                ) : (
                    <span className="text-xs text-muted-foreground px-2">Account Protected</span>
                )}
            </TableCell>
        </TableRow>
    );

    const renderTableContent = (userList: User[], listTypeLabel: string) => (
        <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[250px]">User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/20" />
                            </TableRow>
                        ))
                    ) : userList.length > 0 ? (
                        userList.map(user => renderUserRow(user, user.id === currentUser?.id))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                {searchQuery ? `No ${listTypeLabel.toLowerCase()} found for "${searchQuery}"` : `No ${listTypeLabel.toLowerCase()} found.`}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Integrated Statistics Section */}
            {!loading && (
                <div className="flex flex-wrap gap-4">
                    <div className="p-4 rounded-xl bg-card/20 border border-border/40 backdrop-blur-sm flex items-center gap-4 min-w-[200px]">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <UserCog className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Members</p>
                            <h4 className="text-xl font-bold">{stats?.total_users || 0}</h4>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                <div className="relative w-full sm:w-72 bg-card/30 backdrop-blur-sm border border-border/40 rounded-md flex items-center">
                    <Search className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none" />
                    <Input
                        placeholder="Search users by name, username or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 h-10 w-full"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-card/30 backdrop-blur-sm border-border/40">
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4 opacity-70" />
                                <span>Sort by</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                            <SelectItem value="newest">Newest Joined</SelectItem>
                            <SelectItem value="oldest">Oldest Joined</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="users" className="w-full mt-2">
                <TabsList className="bg-muted/30 backdrop-blur-sm border border-border/40">
                    <TabsTrigger value="users" className="gap-2">
                        Users <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] bg-background/50">{standardUsers.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="admins" className="gap-2">
                        Admins <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] bg-background/50">{admins.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-4">
                    {renderTableContent(standardUsers, "Users")}
                </TabsContent>

                <TabsContent value="admins" className="mt-4">
                    {renderTableContent(admins, "Admins")}
                </TabsContent>
            </Tabs>

            <ManageUserModal
                user={selectedUser}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpdate={onRefresh}
            />
        </div>
    );
};

export default UserManagement;
