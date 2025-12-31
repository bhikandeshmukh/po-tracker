// __tests__/components/ErrorBoundary.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../components/Common/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});
afterAll(() => {
    console.error = originalError;
});

describe('ErrorBoundary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Child content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    test('should render error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    test('should show refresh button on error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should show helpful error message', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/something unexpected happened/i)).toBeInTheDocument();
    });

    test('should call window.location.reload on refresh click', () => {
        const reloadMock = jest.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadMock },
            writable: true
        });

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
        expect(reloadMock).toHaveBeenCalled();
    });

    test('should log error to console', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(console.error).toHaveBeenCalled();
    });

    test('should render multiple children correctly', () => {
        render(
            <ErrorBoundary>
                <div>First child</div>
                <div>Second child</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('First child')).toBeInTheDocument();
        expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    test('should catch errors in nested components', () => {
        const NestedError = () => (
            <div>
                <ThrowError shouldThrow={true} />
            </div>
        );

        render(
            <ErrorBoundary>
                <NestedError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
});
