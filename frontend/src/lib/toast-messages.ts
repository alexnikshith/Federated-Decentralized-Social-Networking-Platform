import { toast } from "@/hooks/use-toast";

// Error message mappings for consistent UX
export const ERROR_MESSAGES = {
    // Authentication errors
    ACCOUNT_DEACTIVATED: "This account has been deactivated. Please contact support if you believe this is an error.",
    INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
    EMAIL_ALREADY_EXISTS: "This email is already registered. Please use a different email or try logging in.",
    USERNAME_TAKEN: "This username is already taken. Please choose a different username.",
    VERIFICATION_CODE_INVALID: "The verification code is invalid or has expired. Please request a new code.",
    VERIFICATION_CODE_EXPIRED: "Your verification code has expired. Please request a new one.",
    SESSION_EXPIRED: "Your session has expired. Please log in again to continue.",
    UNAUTHORIZED: "You don't have permission to perform this action.",

    // Profile errors
    PROFILE_NOT_FOUND: "User profile not found. This user may have deleted their account.",
    PROFILE_PRIVATE: "This profile is private. Follow this user to see their content.",
    PROFILE_UPDATE_FAILED: "Failed to update profile. Please try again.",

    // Post errors
    POST_NOT_FOUND: "This post is no longer available. It may have been deleted.",
    POST_DELETE_FAILED: "Failed to delete post. Please try again.",
    POST_CREATE_FAILED: "Failed to create post. Please check your connection and try again.",
    COMMENT_DELETE_TIMEOUT: "Comments can only be deleted within 2 minutes of posting.",
    COMMENT_DELETE_FAILED: "Failed to delete comment. Please try again.",

    // Messaging errors
    MESSAGE_SEND_FAILED: "Failed to send message. Please check your connection and try again.",
    USER_DEACTIVATED: "This account is deactivated.",
    USER_DELETED: "This account doesn't exist anymore.",
    CONVERSATION_DELETE_FAILED: "Failed to delete conversation. Please try again.",

    // Follow errors
    FOLLOW_FAILED: "Failed to follow user. Please try again.",
    UNFOLLOW_FAILED: "Failed to unfollow user. Please try again.",
    BLOCKED_USER: "You cannot follow this user because you have blocked them or they have blocked you.",

    // General errors
    NETWORK_ERROR: "Network error. Please check your internet connection and try again.",
    SERVER_ERROR: "Something went wrong on our end. Please try again later.",
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
    ACTIVITY_PRIVATE: "This activity is private and cannot be viewed.",
};

// Success message mappings
export const SUCCESS_MESSAGES = {
    // Authentication
    LOGIN_SUCCESS: "Welcome back! You've successfully logged in.",
    SIGNUP_SUCCESS: "Account created successfully! Please check your email for verification.",
    LOGOUT_SUCCESS: "You've been logged out successfully.",
    PASSWORD_CHANGED: "Your password has been changed successfully.",

    // Profile
    PROFILE_UPDATED: "Your profile has been updated successfully.",
    ACCOUNT_DEACTIVATED: "Your account has been deactivated. We're sorry to see you go.",

    // Post
    POST_CREATED: "Your post has been published successfully!",
    POST_DELETED: "Post deleted successfully.",
    COMMENT_ADDED: "Your comment has been posted.",
    COMMENT_DELETED: "Comment deleted successfully.",
    POST_SAVED: "Post saved to your collection.",
    POST_UNSAVED: "Post removed from your collection.",
    POST_REPORTED: "Thank you for reporting. We'll review this content shortly.",

    // Messaging
    MESSAGE_SENT: "Message sent successfully.",
    CONVERSATION_DELETED: "Conversation deleted successfully.",

    // Follow
    FOLLOWED: "You're now following this user.",
    UNFOLLOWED: "You've unfollowed this user.",
};

// Info message mappings
export const INFO_MESSAGES = {
    VERIFICATION_CODE_SENT: "A verification code has been sent to your email.",
    LOADING: "Loading...",
    PROCESSING: "Processing your request...",
};

// Toast duration presets (in milliseconds)
export const TOAST_DURATION = {
    SHORT: 3000,    // 3 seconds - for quick confirmations
    MEDIUM: 5000,   // 5 seconds - for standard messages
    LONG: 7000,     // 7 seconds - for important messages that need reading
    PERSISTENT: 10000, // 10 seconds - for critical errors
};

// Helper function to show error toast
export const showError = (message: string, duration: number = TOAST_DURATION.LONG) => {
    toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration,
    });
};

// Helper function to show success toast
export const showSuccess = (message: string, duration: number = TOAST_DURATION.MEDIUM) => {
    toast({
        variant: "default",
        title: "Success",
        description: message,
        duration,
    });
};

// Helper function to show info toast
export const showInfo = (message: string, duration: number = TOAST_DURATION.MEDIUM) => {
    toast({
        variant: "default",
        title: "Info",
        description: message,
        duration,
    });
};

// Helper function to show warning toast
export const showWarning = (message: string, duration: number = TOAST_DURATION.LONG) => {
    toast({
        variant: "default",
        title: "Warning",
        description: message,
        duration,
        className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
    });
};

// Helper to parse API errors and show appropriate message
export const handleApiError = (error: any) => {
    let message = ERROR_MESSAGES.UNKNOWN_ERROR;

    if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error;

        // Map common API error messages to user-friendly messages
        if (errorMsg) {
            const lowerMsg = errorMsg.toLowerCase();

            if (lowerMsg.includes("deactivated")) {
                message = ERROR_MESSAGES.ACCOUNT_DEACTIVATED;
            } else if (lowerMsg.includes("invalid credentials")) {
                message = ERROR_MESSAGES.INVALID_CREDENTIALS;
            } else if (lowerMsg.includes("already registered") || lowerMsg.includes("email already")) {
                message = ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
            } else if (lowerMsg.includes("username") && lowerMsg.includes("taken")) {
                message = ERROR_MESSAGES.USERNAME_TAKEN;
            } else if (lowerMsg.includes("verification code") && lowerMsg.includes("invalid")) {
                message = ERROR_MESSAGES.VERIFICATION_CODE_INVALID;
            } else if (lowerMsg.includes("verification code") && lowerMsg.includes("expired")) {
                message = ERROR_MESSAGES.VERIFICATION_CODE_EXPIRED;
            } else if (lowerMsg.includes("unauthorized")) {
                message = ERROR_MESSAGES.UNAUTHORIZED;
            } else if (lowerMsg.includes("not found")) {
                message = ERROR_MESSAGES.POST_NOT_FOUND;
            } else if (lowerMsg.includes("2 minutes")) {
                message = ERROR_MESSAGES.COMMENT_DELETE_TIMEOUT;
            } else if (lowerMsg.includes("blocked")) {
                message = ERROR_MESSAGES.BLOCKED_USER;
            } else if (lowerMsg.includes("private")) {
                message = ERROR_MESSAGES.ACTIVITY_PRIVATE;
            } else {
                // Use the API error message if it's user-friendly
                message = errorMsg;
            }
        } else if (error.response.status === 401) {
            message = ERROR_MESSAGES.SESSION_EXPIRED;
        } else if (error.response.status === 403) {
            message = ERROR_MESSAGES.UNAUTHORIZED;
        } else if (error.response.status === 404) {
            message = ERROR_MESSAGES.POST_NOT_FOUND;
        } else if (error.response.status >= 500) {
            message = ERROR_MESSAGES.SERVER_ERROR;
        }
    } else if (error.request) {
        message = ERROR_MESSAGES.NETWORK_ERROR;
    }

    showError(message, TOAST_DURATION.LONG);
};
