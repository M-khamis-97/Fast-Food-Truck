const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../connectors/db');
const { createSession } = require('../../utils/session');

// POST /api/v1/user - Register a new user
router.post('/user', async (req, res) => {
    const { name, email, password, role, birthdate, truckName } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // If registering as truck owner, truck name is required
    if (role === 'truckowner' && !truckName) {
        return res.status(400).json({ error: 'Truck name is required for truck owner registration' });
    }

    try {
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT * FROM foodtruck.users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        // Truck owners need admin approval, set status to 'pending'
        const userRole = role || 'customer';
        const userStatus = userRole === 'truckowner' ? 'pending' : 'active';
        
        const result = await db.query(
            `INSERT INTO foodtruck.users (name, email, password, role, birthdate, status) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING userid, name, email, role, birthdate, createdat, status`,
            [name, email, hashedPassword, userRole, birthdate || new Date(), userStatus]
        );

        const user = result.rows[0];

        // Debug log
        console.log('User registered:', { email: user.email, role: user.role, status: user.status });

        // If truck owner, create a truck automatically
        if (user.role === 'truckowner') {
            // Create truck with 'pending' status (needs admin approval)
            await db.query(
                `INSERT INTO foodtruck.trucks (ownerid, truckname, truckstatus, orderstatus) 
                 VALUES ($1, $2, 'pending', 'unavailable')`,
                [user.userid, truckName]
            );
            
            console.log('Truck created for new owner:', truckName);
            console.log('Truck owner pending approval - no session created');
            
            return res.status(201).json({
                message: 'Registration submitted! Your truck owner account and truck are pending admin approval. You will be able to login once approved.',
                requiresApproval: true,
                user: {
                    userid: user.userid,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    truckName: truckName
                }
            });
        }

        // Create session for customers
        const session = await createSession(user.userid, user.role, user.name, user.email);

        // Set cookie
        res.cookie('token', session.token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                userid: user.userid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/v1/user/login - Login user
router.post('/user/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Get user by email only
        const result = await db.query(
            'SELECT * FROM foodtruck.users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Debug: Show hashing in action
        console.log('🔐 Password Check:');
        console.log('   Input (plain):', password);
        console.log('   Stored (hash):', user.password);
        
        // Verify password using bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('   Match Result:', passwordMatch ? '✅ SUCCESS' : '❌ FAILED');
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Debug log
        console.log('Login attempt:', { email: user.email, role: user.role, status: user.status });
        
        // Check if user is pending approval
        if (user.status === 'pending') {
            console.log('Login blocked: User is pending approval');
            return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for approval to login.' });
        }
        
        // Check if user is active (except for admins)
        if (user.status === 'inactive' && user.role !== 'admin') {
            console.log('Login blocked: User is inactive');
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
        }
        
        console.log('Login successful for:', user.email);

        // Create session
        const session = await createSession(user.userid, user.role, user.name, user.email);

        // Set cookie
        res.cookie('token', session.token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Login successful',
            user: {
                userid: user.userid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks - Get all available trucks
router.get('/trucks', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.truckid, t.truckname, t.trucklogo, t.truckstatus, t.orderstatus, 
                    u.name as ownername, t.createdat
             FROM foodtruck.trucks t
             LEFT JOIN foodtruck.users u ON t.ownerid = u.userid
             WHERE t.truckstatus = 'available'
             ORDER BY t.truckid ASC`
        );

        res.json({ trucks: result.rows });
    } catch (error) {
        console.error('Error fetching trucks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/view - View all available trucks (user story)
// IMPORTANT: This route must come before /api/trucks/:truckid to avoid "view" being treated as truckid
router.get('/trucks/view', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                truckid AS "truckId",
                truckname AS "truckName",
                trucklogo AS "truckLogo",
                ownerid AS "ownerId",
                truckstatus AS "truckStatus",
                orderstatus AS "orderStatus",
                createdat AS "createdAt"
             FROM foodtruck.trucks
             WHERE truckstatus = 'available' AND orderstatus = 'available'
             ORDER BY truckid ASC`
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching available trucks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/:truckid/menu - Get menu items for a truck
// IMPORTANT: This route must come before /api/trucks/:truckid to avoid "menu" conflicts
router.get('/trucks/:truckid/menu', async (req, res) => {
    const { truckid } = req.params;

    try {
        const result = await db.query(
            `SELECT itemid, truckid, name, description, price, category, status, createdat
             FROM foodtruck.menuitems
             WHERE truckid = $1 AND status = 'available'
             ORDER BY category, name`,
            [truckid]
        );

        res.json({ menuItems: result.rows });
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/:truckid - Get truck details
router.get('/trucks/:truckid', async (req, res, next) => {
    const { truckid } = req.params;

    // If truckid is not a number, skip this route (let it go to next handler)
    if (isNaN(truckid)) {
        return next();
    }

    try {
        const result = await db.query(
            `SELECT t.truckid, t.truckname, t.trucklogo, t.truckstatus, t.orderstatus, 
                    u.name as ownername, u.email as owneremail, t.createdat
             FROM foodtruck.trucks t
             LEFT JOIN foodtruck.users u ON t.ownerid = u.userid
             WHERE t.truckid = $1`,
            [truckid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found' });
        }

        res.json({ truck: result.rows[0] });
    } catch (error) {
        console.error('Error fetching truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/menuItem/truck/:truckId - View menu items for a specific truck (user story)
router.get('/menuItem/truck/:truckId', async (req, res) => {
    const { truckId } = req.params;

    try {
        const result = await db.query(
            `SELECT 
                itemid AS "itemId",
                truckid AS "truckId",
                name,
                description,
                price,
                category,
                status,
                createdat AS "createdAt"
             FROM foodtruck.menuitems
             WHERE truckid = $1 AND status = 'available'
             ORDER BY itemid ASC`,
            [truckId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching menu items for truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/menuItem/truck/:truckId/category/:category - Search menu items by category (user story)
router.get('/menuItem/truck/:truckId/category/:category', async (req, res) => {
    const { truckId, category } = req.params;

    try {
        const result = await db.query(
            `SELECT 
                itemid AS "itemId",
                truckid AS "truckId",
                name,
                description,
                price,
                category,
                status,
                createdat AS "createdAt"
             FROM foodtruck.menuitems
             WHERE truckid = $1 AND category = $2 AND status = 'available'
             ORDER BY itemid ASC`,
            [truckId, category]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching menu items by category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
