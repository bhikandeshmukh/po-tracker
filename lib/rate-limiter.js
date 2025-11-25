// lib/rate-limiter.js
// Rate limiting middleware to prevent API abuse
// Simple in-memory implementation (no external dependencies)

// In-memory store for rate limiting
class RateLimitStore {
    constructor() {
        this.requests = new Map();
        // Clean up old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    getKey(identifier, windowMs) {
        const now = Date.now();
        const windowStart = Math.floor(now / windowMs) * windowMs;
        return `${identifier}:${windowStart}`;
    }

    increment(identifier, windowMs) {
        const key = this.getKey(identifier, windowMs);
        const current = this.requests.get(key) || 0;
        const newCount = current + 1;
        this.requests.set(key, newCount);
        return newCount;
    }

    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key] of this.requests) {
            const [, timestamp] = key.split(':');
            const age = now - parseInt(timestamp);
            
            // Delete entries older than 1 hour
            if (age > 60 * 60 * 1000) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.requests.delete(key));
    }
}

const store = new RateLimitStore();

// Create rate limiter middleware
function createRateLimiter(options = {}) {
    const {
        windowMs = 60 * 1000, // 1 minute
        max = 100, // 100 requests per window
        message = 'Too many requests, please try again later'
    } = options;

    return (req, res, next) => {
        try {
            // Get identifier (user ID or IP)
            const identifier = req.user?.uid || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
            
            // Check rate limit
            const requestCount = store.increment(identifier, windowMs);
            
            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestCount));
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
            
            if (requestCount > max) {
                return res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message,
                        retryAfter: Math.ceil(windowMs / 1000)
                    }
                });
            }
            
            next();
        } catch (error) {
            // If rate limiting fails, allow the request
            console.error('Rate limiter error:', error);
            next();
        }
    };
}

// Strict rate limiter for sensitive operations
const strictRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many attempts, please try again after 15 minutes'
});

// Standard rate limiter for general API
const standardRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please slow down'
});

// Lenient rate limiter for read operations
const lenientRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    message: 'Too many requests, please slow down'
});

// Create operation limiter
const createOperationLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 creates per minute
    message: 'Too many create operations, please slow down'
});

// Bulk operation limiter
const bulkOperationLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 bulk operations per 5 minutes
    message: 'Too many bulk operations, please wait before trying again'
});

module.exports = {
    createRateLimiter,
    strictRateLimiter,
    standardRateLimiter,
    lenientRateLimiter,
    createOperationLimiter,
    bulkOperationLimiter
};
