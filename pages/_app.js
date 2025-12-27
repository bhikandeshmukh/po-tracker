// pages/_app.js
import { useEffect } from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-client';

function MyApp({ Component, pageProps }) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('SW registered: ', registration);
                    },
                    (registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                    }
                );
            });
        }
    }, []);

    return (
        <AuthProvider>
            <Component {...pageProps} />
        </AuthProvider>
    );
}

export default MyApp;
