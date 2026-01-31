import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';

const About: React.FC = () => {
    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6">About Nexus</h1>

                    <div className="prose dark:prose-invert">
                        <p className="text-lg mb-4">
                            Nexus is a federated social networking platform that prioritizes user privacy,
                            data ownership, and community governance.
                        </p>

                        <h2 className="text-xl font-semibold mt-6 mb-3">Our Mission</h2>
                        <p className="mb-4">
                            To create a decentralized social web where you own your identity and control your data.
                            Connect with communities that share your values without improved algorithmic manipulation.
                        </p>

                        <h2 className="text-xl font-semibold mt-6 mb-3">Features</h2>
                        <ul className="list-disc pl-6 mb-4 space-y-2">
                            <li>Decentralized Identity</li>
                            <li>Federated Content Sharing</li>
                            <li>Community-Driven Moderation</li>
                            <li>Privacy-First Architecture</li>
                        </ul>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default About;
