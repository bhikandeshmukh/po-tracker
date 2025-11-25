// lib/retry-handler.js
// Exponential backoff retry logic for failed requests

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        shouldRetry = (error) => {
            // Retry on network errors and 5xx server errors
            return (
                error.message?.includes('fetch') ||
                error.message?.includes('network') ||
                error.status >= 500
            );
        }
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if this is the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Check if we should retry this error
            if (!shouldRetry(error)) {
                throw error;
            }

            // Wait before retrying
            await sleep(delay);

            // Increase delay for next attempt (exponential backoff)
            delay = Math.min(delay * backoffMultiplier, maxDelay);

            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        }
    }

    throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
    // Quick retry for fast operations
    quick: {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 2000,
        backoffMultiplier: 2
    },

    // Standard retry for normal operations
    standard: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    },

    // Aggressive retry for critical operations
    aggressive: {
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2
    }
};
