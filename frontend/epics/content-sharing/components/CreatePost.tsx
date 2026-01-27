import React, { useState } from 'react';
import { useContentStore } from '../store/contentStore';

export const CreatePost: React.FC = () => {
    const [content, setContent] = useState('');
    const { createPost, loading } = useContentStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        await createPost(content);
        setContent('');
    };

    return (
        <div className="create-post">
            <form onSubmit={handleSubmit}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={5000}
                    rows={3}
                    disabled={loading}
                />
                <div className="create-post-footer">
                    <span className="char-count">{content.length}/5000</span>
                    <button type="submit" disabled={loading || !content.trim()}>
                        {loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>
        </div>
    );
};
