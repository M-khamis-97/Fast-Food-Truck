const { validateSession } = require('../utils/session');

async function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const session = await validateSession(token);
        
        if (!session) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
        }

        req.user = session;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function checkRole(requiredRole) {
    return async (req, res, next) => {
        if (req.user.role !== requiredRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
}

module.exports = {
    authMiddleware,
    checkRole
};
