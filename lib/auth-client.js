// lib/auth-client.js
// Frontend authentication helper using Firebase Email Authentication

import { auth } from './firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import apiClient from './api-client';

class AuthClient {
    constructor() {
        this.currentUser = null;
        this.setupAuthListener();
    }

    // Setup auth state listener
    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                const token = await user.getIdToken();
                apiClient.setToken(token);
                this.currentUser = user;
                
                // Store token in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('authToken', token);
                }
            } else {
                // User is signed out
                apiClient.setToken(null);
                this.currentUser = null;
                
                // Clear token from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('authToken');
                }
            }
        });
    }

    // Login with email and password
    async login(email, password) {
        try {
            // Sign in with Firebase (this verifies password)
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get ID token
            const token = await user.getIdToken();

            // Set token in API client
            apiClient.setToken(token);

            // Store token in localStorage for persistence
            if (typeof window !== 'undefined') {
                localStorage.setItem('authToken', token);
            }

            // Call backend to verify profile and create audit log
            const response = await apiClient.post('/auth/login', {});

            if (response.success) {
                return {
                    success: true,
                    user: response.data.user,
                    token: token
                };
            } else {
                throw new Error(response.error?.message || 'Login verification failed');
            }
        } catch (error) {
            console.error('Login error:', error);

            // Handle Firebase errors
            let message = 'Login failed';

            if (error.code === 'auth/user-not-found') {
                message = 'No user found with this email';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password';
            } else if (error.code === 'auth/invalid-credential') {
                message = 'Invalid email or password. Please check your credentials.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email format';
            } else if (error.code === 'auth/user-disabled') {
                message = 'This account has been disabled';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many failed login attempts. Please try again later.';
            } else if (error.message) {
                message = error.message;
            }

            return {
                success: false,
                error: message
            };
        }
    }

    // Register new user
    async register(userData) {
        try {
            const { email, password, firstName, lastName, phone, role } = userData;

            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Get ID token
            const token = await user.getIdToken();
            apiClient.setToken(token);

            // Call backend to create user profile
            const response = await apiClient.post('/auth/register', {
                email,
                password,
                firstName,
                lastName,
                phone,
                role
            });

            if (response.success) {
                return {
                    success: true,
                    user: response.data
                };
            } else {
                // If backend fails, delete the Firebase user
                await user.delete();
                throw new Error(response.error?.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);

            let message = 'Registration failed';

            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already registered';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email format';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak. Use at least 6 characters.';
            } else if (error.message) {
                message = error.message;
            }

            return {
                success: false,
                error: message
            };
        }
    }

    // Logout
    async logout() {
        try {
            // Call backend logout
            await apiClient.post('/auth/logout');

            // Sign out from Firebase
            await signOut(auth);

            // Clear token
            apiClient.setToken(null);
            this.currentUser = null;
            
            // Clear from localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('authToken');
            }

            return {
                success: true,
                message: 'Logged out successfully'
            };
        } catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: error.message || 'Logout failed'
            };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get user token
    async getToken() {
        if (this.currentUser) {
            return await this.currentUser.getIdToken();
        }
        return null;
    }

    // Refresh token
    async refreshToken() {
        if (this.currentUser) {
            const token = await this.currentUser.getIdToken(true);
            apiClient.setToken(token);
            return token;
        }
        return null;
    }
}

// Create singleton instance
const authClient = new AuthClient();

// React Context for Auth
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({
    user: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { }
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (process.env.NODE_ENV === 'development') {
                console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
            }
            
            if (firebaseUser) {
                const token = await firebaseUser.getIdToken();
                apiClient.setToken(token);

                try {
                    // Fetch user profile from backend to get role and permissions
                    const response = await apiClient.post('/auth/login', {});
                    
                    if (response.success && response.data?.user) {
                        setUser(response.data.user);
                    } else {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn('Backend response missing user data, using fallback');
                        }
                        // Fallback to basic Firebase user info
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            name: firebaseUser.displayName,
                            role: 'user'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    // Fallback to basic Firebase user info
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName,
                        role: 'user'
                    });
                }
            } else {
                apiClient.setToken(null);
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const result = await authClient.login(email, password);
        if (result.success) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Login successful, user data:', result.user);
            }
            setUser(result.user);
            return result.user;
        } else {
            throw new Error(result.error);
        }
    };

    const register = async (userData) => {
        const result = await authClient.register(userData);
        if (result.success) {
            setUser(result.user);
            return result.user;
        } else {
            throw new Error(result.error);
        }
    };

    const logout = async () => {
        await authClient.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export { apiClient };
export default authClient;
