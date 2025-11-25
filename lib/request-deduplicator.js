// lib/request-deduplicator.js
// Prevent duplicate API requests

class RequestDeduplicator {
    constructor() {
        this.pendingRequests = new Map();
    }

    /**
     * Execute a request with deduplication
     * If same request is already in progress, return the existing promise
     */
    async execute(key, requestFn) {
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Create new request promise
        const promise = requestFn()
            .finally(() => {
                // Clean up after request completes
                this.pendingRequests.delete(key);
            });

        // Store pending request
        this.pendingRequests.set(key, promise);

        return promise;
    }

    /**
     * Cancel a pending request
     */
    cancel(key) {
        this.pendingRequests.delete(key);
    }

    /**
     * Clear all pending requests
     */
    clear() {
        this.pendingRequests.clear();
    }

    /**
     * Get number of pending requests
     */
    getPendingCount() {
        return this.pendingRequests.size;
    }
}

// Create singleton instance
const deduplicator = new RequestDeduplicator();

export default deduplicator;
