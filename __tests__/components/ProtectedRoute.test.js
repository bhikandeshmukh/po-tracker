// __tests__/components/ProtectedRoute.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: mockPush,
        pathname: '/dashboard'
    })
}));

// Mock auth-client
const mockUseAuth = jest.fn();
jest.mock('../../lib/auth-client', () => ({
    useAuth: () => mockUseAuth()
}));

import ProtectedRoute from '../../components/ProtectedRoute';

describe('ProtectedRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should show loading state while checking auth', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should redirect to login when not authenticated', async () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/login');
        });
    });

    test('should render children when authenticated', () => {
        mockUseAuth.mockReturnValue({ 
            user: { uid: 'user1', name: 'Test User' }, 
            loading: false 
        });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should not redirect when authenticated', () => {
        mockUseAuth.mockReturnValue({ 
            user: { uid: 'user1', name: 'Test User' }, 
            loading: false 
        });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(mockPush).not.toHaveBeenCalled();
    });

    test('should render null when not authenticated and not loading', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });

        const { container } = render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        // After redirect is triggered, component returns null
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
});
