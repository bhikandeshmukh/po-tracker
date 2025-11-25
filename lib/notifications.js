// lib/notifications.js
// Notification utility - can be replaced with toast library later

export const notify = {
    success: (message) => {
        // For now using alert, can be replaced with toast library
        alert(message);
    },
    
    error: (message) => {
        alert(message);
    },
    
    confirm: (message) => {
        return window.confirm(message);
    },
    
    info: (message) => {
        alert(message);
    }
};

// Future: Replace with react-hot-toast or similar
// import toast from 'react-hot-toast';
// export const notify = {
//     success: (message) => toast.success(message),
//     error: (message) => toast.error(message),
//     confirm: (message) => window.confirm(message),
//     info: (message) => toast.info(message)
// };
