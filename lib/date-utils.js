// lib/date-utils.js
// Utility functions for date formatting

/**
 * Format date to dd/mm/yyyy format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-GB');
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

/**
 * Format date to dd/mm/yyyy hh:mm AM/PM format (12-hour)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (error) {
        console.error('Error formatting date time:', error);
        return 'Invalid Date';
    }
};

/**
 * Format date for input fields (yyyy-mm-dd)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string for input
 */
export const formatDateForInput = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error formatting date for input:', error);
        return '';
    }
};

/**
 * Format time string (HH:mm) or range to 12-hour format with AM/PM
 * @param {string} timeStr - Time string (e.g., "14:30" or "09:00-12:00")
 * @returns {string} Formatted time string
 */
export const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';

    // Handle ranges like "09:00-12:00"
    if (timeStr.includes('-')) {
        return timeStr.split('-').map(t => formatTime12Hour(t.trim())).join(' - ');
    }

    try {
        const [hours, minutes] = timeStr.split(':');
        if (hours === undefined || minutes === undefined) return timeStr;

        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));

        return date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toUpperCase();
    } catch (error) {
        console.error('Error formatting time:', error);
        return timeStr;
    }
};
