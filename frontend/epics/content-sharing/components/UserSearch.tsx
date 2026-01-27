import React, { useState } from 'react';
import type { PublicUser } from '../types';
import * as api from '../api/client';

export const UserSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const users = await api.searchUsers(searchQuery);
            setResults(users);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="user-search">
            <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users..."
                className="search-input"
            />

            {loading && <div className="search-loading">Searching...</div>}

            {results.length > 0 && (
                <div className="search-results">
                    {results.map((user) => (
                        <div key={user.id} className="search-result-item">
                            {user.avatar_url && (
                                <img src={user.avatar_url} alt={user.username} className="avatar" />
                            )}
                            {!user.avatar_url && (
                                <div className="avatar-placeholder">{user.username[0]?.toUpperCase()}</div>
                            )}
                            <div className="user-info">
                                <div className="username">{user.username}</div>
                                {user.display_name && <div className="display-name">{user.display_name}</div>}
                                {user.bio && <div className="bio">{user.bio}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {query && !loading && results.length === 0 && (
                <div className="no-results">No users found</div>
            )}
        </div>
    );
};
