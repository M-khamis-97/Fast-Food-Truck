const crypto = require('crypto');
const db = require('../connectors/db');

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function createSession(userid, role, name, email) {
    const token = generateToken();
    const expiresat = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
        await db.query(
            'INSERT INTO foodtruck.sessions (userid, token, expiresat) VALUES ($1, $2, $3)',
            [userid, token, expiresat]
        );

        return {
            token,
            userid,
            role,
            name,
            email,
            expiresat
        };
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}

async function validateSession(token) {
    try {
        const result = await db.query(
            `SELECT s.userid, s.expiresat, u.role, u.name, u.email 
             FROM foodtruck.sessions s
             JOIN foodtruck.users u ON s.userid = u.userid
             WHERE s.token = $1 AND s.expiresat > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            userid: result.rows[0].userid,
            role: result.rows[0].role,
            name: result.rows[0].name,
            email: result.rows[0].email,
            expiresat: result.rows[0].expiresat
        };
    } catch (error) {
        console.error('Error validating session:', error);
        throw error;
    }
}

async function deleteSession(token) {
    try {
        await db.query('DELETE FROM foodtruck.sessions WHERE token = $1', [token]);
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
}

async function cleanupExpiredSessions() {
    try {
        await db.query('DELETE FROM foodtruck.sessions WHERE expiresat < NOW()');
    } catch (error) {
        console.error('Error cleaning up expired sessions:', error);
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    createSession,
    validateSession,
    deleteSession,
    cleanupExpiredSessions
};
