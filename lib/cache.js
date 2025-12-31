// lib/cache.js
// Simple in-memory cache with TTL

class Cache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, value, ttl = 300000) { // Default 5 minutes
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set value
        this.cache.set(key, value);

        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);

        this.timers.set(key, timer);
    }

    get(key) {
        return this.cache.get(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        this.cache.delete(key);
    }

    // Invalidate all cache entries that match a pattern
    invalidatePattern(pattern) {
        const keysToDelete = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.delete(key));
        return keysToDelete.length;
    }

    clear() {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

// Create singleton instance
const cache = new Cache();

// Cache helper functions
export const cacheKeys = {
    dashboardMetrics: 'dashboard:metrics',
    vendors: (params) => `vendors:${JSON.stringify(params)}`,
    vendor: (id) => `vendor:${id}`,
    transporters: (params) => `transporters:${JSON.stringify(params)}`,
    transporter: (id) => `transporter:${id}`,
    purchaseOrders: (params) => `pos:${JSON.stringify(params)}`,
    purchaseOrder: (id) => `po:${id}`,
    shipments: (params) => `shipments:${JSON.stringify(params)}`,
    appointments: (params) => `appointments:${JSON.stringify(params)}`,
    recentActivities: (limit) => `activities:${limit}`
};

export default cache;
