import React, { useEffect, useState } from 'react';
import { getGuidelines } from '../api/client';
import { CommunityGuideline } from '../types';
import { MainLayout } from '../../../src/components/layout/MainLayout';

const GuidelinesPage: React.FC = () => {
    const [guidelines, setGuidelines] = useState<CommunityGuideline[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGuidelines = async () => {
            try {
                const data = await getGuidelines();
                setGuidelines(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load guidelines');
            } finally {
                setLoading(false);
            }
        };
        fetchGuidelines();
    }, []);

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto px-4 py-12">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
                        Community Guidelines
                    </h1>
                    <p className="text-xl text-gray-400">
                        Our goal is to foster a safe, inclusive, and decentralized environment for everyone.
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center">
                        {error}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {guidelines.map((guideline, index) => (
                            <div
                                key={guideline.id}
                                className="group p-8 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm"
                            >
                                <div className="flex items-start gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xl border border-blue-500/20">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                                            {guideline.title}
                                        </h2>
                                        <p className="text-gray-400 leading-relaxed text-lg">
                                            {guideline.description}
                                        </p>
                                        <div className="mt-4 flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${guideline.severity >= 8 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                guideline.severity >= 5 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                    'bg-green-500/10 text-green-400 border border-green-500/20'
                                                }`}>
                                                Severity: {guideline.severity >= 8 ? 'Critical' : guideline.severity >= 5 ? 'Medium' : 'Standard'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <footer className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-500">
                    <p>
                        Violating these rules may result in content removal and account strikes.
                        Three strikes will lead to account suspension.
                    </p>
                </footer>
            </div>
        </MainLayout>
    );
};

export default GuidelinesPage;
