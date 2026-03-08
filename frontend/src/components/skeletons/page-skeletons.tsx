import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// --- Shared Primitive Skeletons ---

export const PostCardSkeleton = () => (
    <Card className="mb-4 overflow-hidden border-orange-500/10 shadow-sm shadow-orange-500/5">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-64 w-full rounded-md mt-4" />
            <div className="flex gap-4 pt-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
            </div>
        </CardContent>
    </Card>
);

const UserRowSkeleton = () => (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
        <Skeleton className="h-8 w-24" />
    </div>
);

// --- Page-Level Skeletons ---

export const GenericPageSkeleton = () => (
    <div className="min-h-screen bg-background p-6 space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
            <Skeleton className="h-10 w-1/3 max-w-xs" />
            <Skeleton className="h-4 w-1/2 max-w-md" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="min-h-screen">
        <main className="pb-16 pt-6">
            <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content Area */}
                    <div className="flex-1 lg:max-w-2xl xl:max-w-3xl space-y-6">
                        {/* Stories Skeleton */}
                        <div className="flex gap-4 overflow-x-hidden pb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <Skeleton className="h-16 w-16 rounded-full" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                            ))}
                        </div>
                        {/* Feed Filter Skeleton */}
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                        {/* Posts */}
                        <div className="space-y-4">
                            <PostCardSkeleton />
                            <PostCardSkeleton />
                            <PostCardSkeleton />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
);

export const FeedSkeleton = () => (
    <div className="container mx-auto px-4 max-w-2xl py-6 min-h-screen pb-24">
        {/* Create Post Skeleton */}
        <Card className="mb-6 border-orange-500/20 bg-background/50 backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 flex-1 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-full" />
                </div>
            </CardContent>
        </Card>
        {/* Posts */}
        <div className="space-y-4 relative w-full inline-block">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-8 animate-in fade-in duration-500">
        {/* Cover Photo */}
        <Skeleton className="w-full h-48 md:h-64 rounded-xl" />

        {/* Profile Info block */}
        <div className="px-4 pb-4">
            <div className="flex justify-between items-start -mt-16">
                <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
                <Skeleton className="h-10 w-28 rounded-md mt-16" />
            </div>

            <div className="mt-4 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="flex gap-6 mt-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6 border-border">
            <div className="flex gap-6 pb-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
            </div>
        </div>

        {/* Posts */}
        <div className="space-y-4 max-w-2xl mx-auto">
            <PostCardSkeleton />
            <PostCardSkeleton />
        </div>
    </div>
);

export const SettingsSkeleton = () => (
    <div className="container max-w-4xl py-10 px-4">
        {/* Header */}
        <div className="space-y-2 mb-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
        </div>

        {/* Tabs container */}
        <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="h-[200px] w-full md:w-64 rounded-lg" />

            <div className="flex-1 space-y-6">
                <Skeleton className="h-[400px] w-full rounded-lg" />
            </div>
        </div>
    </div>
);

export const NotificationsSkeleton = () => (
    <div className="space-y-2">
        <div className="flex items-start gap-4 p-4 border-b border-border bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
        <div className="flex items-start gap-4 p-4 border-b border-border bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
        <div className="flex items-start gap-4 p-4 border-b border-border bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
        <div className="flex items-start gap-4 p-4 border-b border-border bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
    </div>
);

export const ExploreSkeleton = () => (
    <div className="min-h-screen">
        <main className="pb-16">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 space-y-4">
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    {/* Tabs */}
                    <Skeleton className="h-12 w-full rounded-md mb-8" />
                    {/* Posts */}
                    <div className="space-y-6">
                        <PostCardSkeleton />
                        <PostCardSkeleton />
                    </div>
                </div>
            </div>
        </main>
    </div>
);

export const CommunitiesSkeleton = () => (
    <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Search/Tabs Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <Skeleton className="h-10 w-full md:w-[350px] rounded-full" />
                <Skeleton className="h-10 w-full md:w-[250px] rounded-md" />
            </div>

            {/* User List */}
            <div className="space-y-4">
                <UserRowSkeleton />
                <UserRowSkeleton />
                <UserRowSkeleton />
                <UserRowSkeleton />
                <UserRowSkeleton />
            </div>
        </div>
    </div>
);

export const MessagingSkeleton = () => (
    <div className="w-full h-[calc(100vh-60px)] md:h-screen bg-background flex flex-col md:flex-row overflow-hidden absolute inset-0 md:static z-[40]">
        {/* Left Sidebar (Conversations) */}
        <div className="w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col flex-shrink-0 h-full">
            <div className="p-4 border-b border-border space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex-1 p-2 space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-4/5" />
                    </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            </div>
        </div>

        {/* Right Area (Chat) */}
        <div className="hidden md:flex flex-1 flex-col bg-background/50 relative h-full">
            <div className="h-16 border-b border-border bg-card/50 px-4 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            <div className="flex-1 p-4 space-y-6">
                <div className="flex justify-start">
                    <Skeleton className="h-16 w-64 rounded-2xl rounded-tl-sm" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-48 rounded-2xl rounded-tr-sm" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-20 w-72 rounded-2xl rounded-tr-sm" />
                </div>
                <div className="flex justify-start">
                    <Skeleton className="h-12 w-56 rounded-2xl rounded-tl-sm" />
                </div>
            </div>

            <div className="px-4 py-3 bg-background border-t border-border">
                <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
        </div>
    </div>
);

export const ReportsSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-40" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-40" />
                </CardContent>
            </Card>
        </div>
        <Card className="w-full">
            <CardHeader className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-64" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    </div>
);

export const AdminSkeleton = () => (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
        </div>

        <Skeleton className="h-12 w-[400px] rounded-md" />

        <div className="border border-border rounded-lg overflow-hidden">
            <div className="h-12 bg-muted flex items-center px-4 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="divide-y divide-border">
                <div className="p-4 flex gap-4"><Skeleton className="h-4 w-full" /></div>
                <div className="p-4 flex gap-4"><Skeleton className="h-4 w-full" /></div>
                <div className="p-4 flex gap-4"><Skeleton className="h-4 w-full" /></div>
                <div className="p-4 flex gap-4"><Skeleton className="h-4 w-full" /></div>
                <div className="p-4 flex gap-4"><Skeleton className="h-4 w-full" /></div>
            </div>
        </div>
    </div>
);
