// pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-client';

function MyApp({ Component, pageProps }) {
    return (
        <AuthProvider>
            <Component {...pageProps} />
        </AuthProvider>
    );
}

export default MyApp;
