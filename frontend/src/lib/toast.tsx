import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Trash2, UserPlus, Heart, MessageSquare, Bell } from "lucide-react";

/**
 * Custom toast notifications with icons and rich styling
 */

export const showToast = {
    // Success toasts
    success: (message: string, description?: string) => {
        toast.success(message, {
            description,
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 4000,
        });
    },

    // Error toasts
    error: (message: string, description?: string) => {
        toast.error(message, {
            description,
            icon: <XCircle className="h-5 w-5" />,
            duration: 5000,
        });
    },

    // Warning toasts
    warning: (message: string, description?: string) => {
        toast.warning(message, {
            description,
            icon: <AlertTriangle className="h-5 w-5" />,
            duration: 4500,
        });
    },

    // Info toasts
    info: (message: string, description?: string) => {
        toast.info(message, {
            description,
            icon: <Info className="h-5 w-5" />,
            duration: 4000,
        });
    },

    // Custom action-specific toasts
    postDeleted: () => {
        toast.success("Post deleted", {
            description: "Your post has been successfully removed.",
            icon: <Trash2 className="h-5 w-5" />,
            duration: 3000,
        });
    },

    postCreated: () => {
        toast.success("Post created", {
            description: "Your post is now live!",
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 3000,
        });
    },

    commentAdded: () => {
        toast.success("Comment added", {
            description: "Your comment has been posted.",
            icon: <MessageSquare className="h-5 w-5" />,
            duration: 3000,
        });
    },

    commentDeleted: () => {
        toast.success("Comment deleted", {
            description: "Your comment has been removed.",
            icon: <Trash2 className="h-5 w-5" />,
            duration: 3000,
        });
    },

    liked: () => {
        toast("Liked", {
            description: "Added to your liked posts.",
            icon: <Heart className="h-5 w-5 fill-current text-red-500" />,
            duration: 2000,
        });
    },

    unliked: () => {
        toast("Unliked", {
            description: "Removed from your liked posts.",
            icon: <Heart className="h-5 w-5" />,
            duration: 2000,
        });
    },

    followed: (username: string) => {
        toast.success("Following", {
            description: `You are now following @${username}`,
            icon: <UserPlus className="h-5 w-5" />,
            duration: 3000,
        });
    },

    unfollowed: (username: string) => {
        toast("Unfollowed", {
            description: `You unfollowed @${username}`,
            icon: <UserPlus className="h-5 w-5" />,
            duration: 3000,
        });
    },

    profileUpdated: () => {
        toast.success("Profile updated", {
            description: "Your changes have been saved.",
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 3000,
        });
    },

    passwordChanged: () => {
        toast.success("Password changed", {
            description: "Your password has been updated successfully.",
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 4000,
        });
    },

    accountDeactivated: () => {
        toast.warning("Account deactivated", {
            description: "Your account has been deactivated.",
            icon: <AlertTriangle className="h-5 w-5" />,
            duration: 4000,
        });
    },

    notificationsRead: () => {
        toast("All caught up", {
            description: "All notifications marked as read.",
            icon: <Bell className="h-5 w-5" />,
            duration: 2500,
        });
    },

    // Loading toasts with promise
    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string;
            error: string;
        }
    ) => {
        return toast.promise(promise, {
            loading: messages.loading,
            success: messages.success,
            error: messages.error,
        });
    },

    // Custom toast with action button
    withAction: (
        message: string,
        description: string,
        actionLabel: string,
        onAction: () => void
    ) => {
        toast(message, {
            description,
            action: {
                label: actionLabel,
                onClick: onAction,
            },
            duration: 5000,
        });
    },
};
