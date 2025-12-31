// pages/index.js
// Landing page - redirects to dashboard or login

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-client';

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/dashboard');
            } else {
                router.push('/login');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center space-y-4">
                <div className="animate-pulse">
                    <div className="h-16 w-16 bg-indigo-200 rounded-xl mx-auto mb-4"></div>
                    <div className="h-6 w-48 bg-indigo-200 rounded mx-auto mb-2"></div>
                    <div className="h-4 w-32 bg-indigo-100 rounded mx-auto"></div>
                </div>
            </div>
        </div>
    );
}
