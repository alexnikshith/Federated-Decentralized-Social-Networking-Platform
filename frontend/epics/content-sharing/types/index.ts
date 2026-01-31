export interface Post {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string;
    author_instance: string;
    content: string;
    like_count: number;
    comment_count: number;
    is_liked: boolean;
    created_at: string;
    updated_at: string;
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    content: string;
    created_at: string;
}

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow';
    related_entity_id: string;
    related_user_id: string;
    related_user_name: string;
    related_user_avatar: string;
    is_read: boolean;
    created_at: string;
}

export interface FeedResponse {
    posts: Post[];
    total: number;
}

export interface CreatePostRequest {
    content: string;
}

export interface CreateCommentRequest {
    content: string;
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
}
