// components/Common/ErrorBoundary.js
import React from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null,
            eventId: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Store error info for display
        this.setState({ errorInfo });

        // Generate unique error ID for tracking
        const eventId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.setState({ eventId });

        // In production, you could send to error tracking service
        if (process.env.NODE_ENV === 'production') {
            this.logErrorToService(error, errorInfo, eventId);
        }
    }

    logErrorToService(error, errorInfo, eventId) {
        // Placeholder for error tracking service integration
        // e.g., Sentry, LogRocket, etc.
        try {
            const errorData = {
                eventId,
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo?.componentStack,
                url: typeof window !== 'undefined' ? window.location.href : '',
                timestamp: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
            };
            
            // Could POST to /api/log-error endpoint
            console.log('Error logged:', errorData);
        } catch (e) {
            console.error('Failed to log error:', e);
        }
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null,
            eventId: null 
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI from props
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isDev = process.env.NODE_ENV === 'development';

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Something went wrong
                            </h2>
                            <p className="text-gray-600 mb-2">
                                We're sorry, but something unexpected happened.
                            </p>
                            {this.state.eventId && (
                                <p className="text-xs text-gray-400 mb-6">
                                    Error ID: {this.state.eventId}
                                </p>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                <Home className="w-4 h-4" />
                                Go to Dashboard
                            </button>
                        </div>

                        <button
                            onClick={this.handleReload}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            Or refresh the page
                        </button>

                        {/* Development error details */}
                        {isDev && this.state.error && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
                                >
                                    <Bug className="w-4 h-4" />
                                    {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                                </button>
                                
                                {this.state.showDetails && (
                                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
                                        <p className="text-red-400 font-mono text-sm mb-2">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo?.componentStack && (
                                            <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
