// lib/validation.js
// Form validation utilities

/**
 * Validate email format
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format
 * Accepts: +91XXXXXXXXXX, XXXXXXXXXX, +1-XXX-XXX-XXXX, etc.
 */
export const validatePhone = (phone) => {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate date range (end date must be >= start date)
 */
export const validateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return true; // Allow empty
    return new Date(endDate) >= new Date(startDate);
};

/**
 * Validate SKU format (alphanumeric with optional hyphens/underscores)
 */
export const validateSKU = (sku) => {
    const skuRegex = /^[A-Za-z0-9_-]+$/;
    return skuRegex.test(sku);
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
};

/**
 * Validate positive integer
 */
export const validatePositiveInteger = (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
};

/**
 * Validate required field
 */
export const validateRequired = (value) => {
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value, minLength) => {
    if (typeof value !== 'string') return false;
    return value.length >= minLength;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value, maxLength) => {
    if (typeof value !== 'string') return false;
    return value.length <= maxLength;
};

/**
 * Validate GST number format (Indian)
 */
export const validateGSTNumber = (gst) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
};

/**
 * Validate PAN number format (Indian)
 */
export const validatePANNumber = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
};

/**
 * Get validation error message
 */
export const getValidationError = (field, value, rules = {}) => {
    if (rules.required && !validateRequired(value)) {
        return `${field} is required`;
    }
    
    if (rules.email && value && !validateEmail(value)) {
        return `${field} must be a valid email`;
    }
    
    if (rules.phone && value && !validatePhone(value)) {
        return `${field} must be a valid phone number`;
    }
    
    if (rules.minLength && value && !validateMinLength(value, rules.minLength)) {
        return `${field} must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && value && !validateMaxLength(value, rules.maxLength)) {
        return `${field} must be at most ${rules.maxLength} characters`;
    }
    
    if (rules.positiveNumber && value && !validatePositiveNumber(value)) {
        return `${field} must be a positive number`;
    }
    
    if (rules.positiveInteger && value && !validatePositiveInteger(value)) {
        return `${field} must be a positive integer`;
    }
    
    return null;
};

/**
 * Validate entire form
 */
export const validateForm = (formData, validationRules) => {
    const errors = {};
    
    Object.keys(validationRules).forEach(field => {
        const error = getValidationError(field, formData[field], validationRules[field]);
        if (error) {
            errors[field] = error;
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export default {
    validateEmail,
    validatePhone,
    validateDateRange,
    validateSKU,
    validatePositiveNumber,
    validatePositiveInteger,
    validateRequired,
    validateMinLength,
    validateMaxLength,
    validateGSTNumber,
    validatePANNumber,
    getValidationError,
    validateForm
};
