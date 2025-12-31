import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-client';
import ErrorBoundary from '../components/Common/ErrorBoundary';

function MyApp({ Component, pageProps }) {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Component {...pageProps} />
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default MyApp;
