export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}

export interface BlockResponse {
    success: boolean;
    message: string;
    data?: any;
}
