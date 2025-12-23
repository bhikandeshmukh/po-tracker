// lib/logger.js
// Structured logging with Winston (Vercel-compatible)

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
});

// Check if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

// Create transports array
const transports = [
    // Console transport (always enabled)
    new winston.transports.Console({
        format: combine(
            colorize(),
            logFormat
        )
    })
];

// Only add file transports in non-serverless environments
if (!isServerless) {
    try {
        const fs = require('fs');
        const logsDir = 'logs';
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        transports.push(
            // File transport for errors
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            // File transport for all logs
            new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            })
        );
    } catch (err) {
        console.warn('File logging disabled:', err.message);
    }
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports
});

// Add request logging helper
logger.logRequest = (req, user = null) => {
    logger.info('API Request', {
        method: req.method,
        url: req.url,
        userId: user?.uid || 'anonymous',
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent']
    });
};

// Add response logging helper
logger.logResponse = (req, res, duration) => {
    logger.info('API Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
    });
};

export default logger;
