// Post represents a single content item in the feed
export interface Post {
    id: string;
    author_id: string;
    author_name: string;
    author_display_name?: string;
    author_avatar: string;
    author_instance: string;
    content: string;
    media_url?: string;
    media_type?: string;
    like_count: number;
    comment_count: number;
    is_liked: boolean;
    is_saved: boolean;
    mentioned_usernames?: string[];
    created_at: string;
    updated_at: string;
    is_remote?: boolean;
}

// Comment represents a user response to a post
export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    content: string;
    parent_id?: string;
    parent_user_name?: string;
    replies?: Comment[];
    created_at: string;
}

// Notification alerts the user to interactions
export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'story_like';
    related_entity_id: string;
    related_user_id: string;
    related_user_name: string;
    related_user_avatar: string;
    comment_content?: string;           // Content of the comment (for comment notifications)
    parent_comment_id?: string;         // ID of parent comment (for replies)
    parent_comment_content?: string;    // Content of parent comment
    parent_user_name?: string;          // Username of parent comment author
    is_read: boolean;
    created_at: string;
}

// Responses Types
export interface FeedResponse {
    posts: Post[];
    total: number;
}

// Request DTOs
export interface CreatePostRequest {
    content: string;
    media_url?: string;
    media_type?: string;
}

export interface CreateCommentRequest {
    content: string;
    parent_id?: string;
}

export interface ReportPostRequest {
    reason: string;
}

export interface PostInteractionRequest {
    type: 'interested' | 'not_interested';
}

export interface PublicUser {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    avatar_url: string;
    profile_visibility: string;
    created_at: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    is_following?: boolean;
    instance?: string;
}

export interface PostLiker {
    user_id: string;
    user_name: string;
    user_avatar: string;
}
