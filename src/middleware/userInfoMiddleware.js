// Rate limiting middleware to prevent abuse
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        for (const [ip, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
            if (validTimestamps.length === 0) {
                requests.delete(ip);
            } else {
                requests.set(ip, validTimestamps);
            }
        }

        // Check current IP
        const clientRequests = requests.get(clientIp) || [];
        const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);

        if (recentRequests.length >= max) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Add current request
        recentRequests.push(now);
        requests.set(clientIp, recentRequests);

        next();
    };
};

// Request validation middleware
const validateUserInfoRequest = (req, res, next) => {
    // Add any request validation logic here
    // For now, we'll just pass through
    next();
};

// Response headers middleware
const setResponseHeaders = (req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Service', 'user-info-api');
    next();
};

module.exports = {
    rateLimit,
    validateUserInfoRequest,
    setResponseHeaders
};
