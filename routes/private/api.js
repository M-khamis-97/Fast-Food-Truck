const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../connectors/db');
const { deleteSession } = require('../../utils/session');

// POST /api/logout - Logout user
router.post('/logout', async (req, res) => {
    const token = req.cookies.token;

    if (token) {
        await deleteSession(token);
    }

    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// ============================================
// CART ROUTES
// ============================================

// GET /api/cart - Get user's cart
router.get('/cart', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.cartid, c.userid, c.itemid, c.quantity, c.price,
                    m.name, m.description, m.category, m.truckid,
                    t.truckname
             FROM foodtruck.carts c
             JOIN foodtruck.menuitems m ON c.itemid = m.itemid
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE c.userid = $1`,
            [req.user.userid]
        );

        const total = result.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

        res.json({ 
            cartItems: result.rows,
            total: total.toFixed(2)
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/cart - Add item to cart
router.post('/cart', async (req, res) => {
    const { itemid, quantity } = req.body;

    if (!itemid || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid itemid and quantity are required' });
    }

    try {
        // Get item details
        const itemResult = await db.query(
            'SELECT * FROM foodtruck.menuitems WHERE itemid = $1 AND status = $2',
            [itemid, 'available']
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or unavailable' });
        }

        const item = itemResult.rows[0];

        // Check if item already in cart
        const existingCart = await db.query(
            'SELECT * FROM foodtruck.carts WHERE userid = $1 AND itemid = $2',
            [req.user.userid, itemid]
        );

        if (existingCart.rows.length > 0) {
            // Update quantity
            const result = await db.query(
                'UPDATE foodtruck.carts SET quantity = quantity + $1 WHERE userid = $2 AND itemid = $3 RETURNING *',
                [quantity, req.user.userid, itemid]
            );
            res.json({ message: 'Cart updated', cartItem: result.rows[0] });
        } else {
            // Insert new cart item
            const result = await db.query(
                'INSERT INTO foodtruck.carts (userid, itemid, quantity, price) VALUES ($1, $2, $3, $4) RETURNING *',
                [req.user.userid, itemid, quantity, item.price]
            );
            res.status(201).json({ message: 'Item added to cart', cartItem: result.rows[0] });
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/cart/:cartid - Update cart item quantity
router.put('/cart/:cartid', async (req, res) => {
    const { cartid } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }

    try {
        const result = await db.query(
            'UPDATE foodtruck.carts SET quantity = $1 WHERE cartid = $2 AND userid = $3 RETURNING *',
            [quantity, cartid, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        res.json({ message: 'Cart item updated', cartItem: result.rows[0] });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/cart/:cartid - Remove item from cart
router.delete('/cart/:cartid', async (req, res) => {
    const { cartid } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM foodtruck.carts WHERE cartid = $1 AND userid = $2 RETURNING *',
            [cartid, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/cart - Clear all cart items
router.delete('/cart', async (req, res) => {
    try {
        await db.query('DELETE FROM foodtruck.carts WHERE userid = $1', [req.user.userid]);
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/cart/new - Add menu item to cart (user story)
router.post('/cart/new', async (req, res) => {
    const { itemId, quantity, price } = req.body;

    if (!itemId || !quantity || !price || quantity < 1) {
        return res.status(400).json({ error: 'Valid itemId, quantity, and price are required' });
    }

    try {
        // Get the menu item to find its truckId
        const itemResult = await db.query(
            'SELECT truckid, status FROM foodtruck.menuitems WHERE itemid = $1',
            [itemId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        const menuItem = itemResult.rows[0];

        if (menuItem.status !== 'available') {
            return res.status(400).json({ error: 'Menu item is not available' });
        }

        // Check if user already has items in cart from a different truck
        const existingCartResult = await db.query(
            `SELECT DISTINCT m.truckid
             FROM foodtruck.carts c
             JOIN foodtruck.menuitems m ON c.itemid = m.itemid
             WHERE c.userid = $1`,
            [req.user.userid]
        );

        if (existingCartResult.rows.length > 0) {
            const existingTruckId = existingCartResult.rows[0].truckid;
            if (existingTruckId !== menuItem.truckid) {
                return res.status(400).json({ message: 'Cannot order from multiple trucks' });
            }
        }

        // Add item to cart
        await db.query(
            `INSERT INTO foodtruck.carts (userid, itemid, quantity, price)
             VALUES ($1, $2, $3, $4)`,
            [req.user.userid, itemId, quantity, price]
        );

        res.status(200).json({ message: 'item added to cart successfully' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/cart/view - View cart (user story)
router.get('/cart/view', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                c.cartid AS "cartId",
                c.userid AS "userId",
                c.itemid AS "itemId",
                m.name AS "itemName",
                c.price,
                c.quantity
             FROM foodtruck.carts c
             JOIN foodtruck.menuitems m ON c.itemid = m.itemid
             WHERE c.userid = $1
             ORDER BY c.cartid ASC`,
            [req.user.userid]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/cart/delete/:cartId - Delete item from cart (user story)
router.delete('/cart/delete/:cartId', async (req, res) => {
    const { cartId } = req.params;

    try {
        // Verify cart item belongs to current user and delete
        const result = await db.query(
            'DELETE FROM foodtruck.carts WHERE cartid = $1 AND userid = $2 RETURNING *',
            [cartId, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found or does not belong to you' });
        }

        res.status(200).json({ message: 'item removed from cart successfully' });
    } catch (error) {
        console.error('Error deleting cart item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/cart/edit/:cartId - Edit cart item quantity (user story)
router.put('/cart/edit/:cartId', async (req, res) => {
    const { cartId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }

    try {
        // Verify cart item belongs to current user and update
        const result = await db.query(
            'UPDATE foodtruck.carts SET quantity = $1 WHERE cartid = $2 AND userid = $3 RETURNING *',
            [quantity, cartId, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found or does not belong to you' });
        }

        res.status(200).json({ message: 'cart updated successfully' });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ORDER ROUTES
// ============================================

// POST /api/order/new - Place an order (user story)
router.post('/order/new', async (req, res) => {
    const { scheduledPickupTime } = req.body;

    if (!scheduledPickupTime) {
        return res.status(400).json({ error: 'scheduledPickupTime is required' });
    }

    try {
        // Get all cart items with their truck information
        const cartResult = await db.query(
            `SELECT c.cartid, c.itemid, c.quantity, c.price, m.truckid
             FROM foodtruck.carts c
             JOIN foodtruck.menuitems m ON c.itemid = m.itemid
             WHERE c.userid = $1`,
            [req.user.userid]
        );

        if (cartResult.rows.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Verify all items are from the same truck
        const truckIds = [...new Set(cartResult.rows.map(item => item.truckid))];
        if (truckIds.length > 1) {
            return res.status(400).json({ error: 'Cannot order from multiple trucks' });
        }

        const truckId = truckIds[0];

        // Calculate total price
        const totalPrice = cartResult.rows.reduce((sum, item) => 
            sum + (parseFloat(item.price) * item.quantity), 0
        );

        // Calculate estimated earliest pickup (e.g., 30 minutes from now)
        const estimatedEarliestPickup = new Date(Date.now() + 30 * 60 * 1000);

        // Insert order record
        const orderResult = await db.query(
            `INSERT INTO foodtruck.orders 
             (userid, truckid, orderstatus, totalprice, scheduledpickuptime, estimatedearliestpickup)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING orderid`,
            [req.user.userid, truckId, 'pending', totalPrice, scheduledPickupTime, estimatedEarliestPickup]
        );

        const orderId = orderResult.rows[0].orderid;

        // Insert order items
        for (const cartItem of cartResult.rows) {
            await db.query(
                `INSERT INTO foodtruck.orderitems (orderid, itemid, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, cartItem.itemid, cartItem.quantity, cartItem.price]
            );
        }

        // Delete all cart items for the user
        await db.query(
            'DELETE FROM foodtruck.carts WHERE userid = $1',
            [req.user.userid]
        );

        res.status(200).json({ message: 'order placed successfully' });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/order/myOrders - View my orders (user story)
router.get('/order/myOrders', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                o.orderid AS "orderId",
                o.userid AS "userId",
                o.truckid AS "truckId",
                t.truckname AS "truckName",
                o.orderstatus AS "orderStatus",
                o.totalprice AS "totalPrice",
                o.scheduledpickuptime AS "scheduledPickupTime",
                o.estimatedearliestpickup AS "estimatedEarliestPickup",
                o.createdat AS "createdAt"
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.userid = $1
             ORDER BY o.orderid DESC`,
            [req.user.userid]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/order/details/:orderId - View order details (user story)
router.get('/order/details/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        // Get order details and verify it belongs to current user
        const orderResult = await db.query(
            `SELECT 
                o.orderid AS "orderId",
                t.truckname AS "truckName",
                o.orderstatus AS "orderStatus",
                o.totalprice AS "totalPrice",
                o.scheduledpickuptime AS "scheduledPickupTime",
                o.estimatedearliestpickup AS "estimatedEarliestPickup",
                o.createdat AS "createdAt"
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.orderid = $1 AND o.userid = $2`,
            [orderId, req.user.userid]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or does not belong to you' });
        }

        const orderDetails = orderResult.rows[0];

        // Get order items
        const itemsResult = await db.query(
            `SELECT 
                m.name AS "itemName",
                oi.quantity,
                oi.price
             FROM foodtruck.orderitems oi
             JOIN foodtruck.menuitems m ON oi.itemid = m.itemid
             WHERE oi.orderid = $1`,
            [orderId]
        );

        orderDetails.items = itemsResult.rows;

        res.status(200).json(orderDetails);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/order/truckOrders - View orders for my truck (user story)
router.get('/order/truckOrders', async (req, res) => {
    try {
        // Get all orders for trucks owned by this user
        const ordersResult = await db.query(
            `SELECT 
                o.orderid AS "orderId",
                o.userid AS "userId",
                u.name AS "customerName",
                u.email AS "customerEmail",
                o.orderstatus AS "orderStatus",
                o.totalprice AS "totalPrice",
                o.scheduledpickuptime AS "scheduledPickupTime",
                o.estimatedearliestpickup AS "estimatedEarliestPickup",
                o.createdat AS "createdAt",
                t.truckname AS "truckName"
             FROM foodtruck.orders o
             JOIN foodtruck.users u ON o.userid = u.userid
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE t.ownerid = $1
             ORDER BY o.orderid DESC`,
            [req.user.userid]
        );

        res.status(200).json(ordersResult.rows);
    } catch (error) {
        console.error('Error fetching truck orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/order/updateStatus/:orderId - Update order status (user story)
router.put('/order/updateStatus/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { orderStatus, estimatedEarliestPickup } = req.body;

    // Validate orderStatus
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
        return res.status(400).json({ error: 'Valid orderStatus is required (pending, preparing, ready, completed, cancelled)' });
    }

    try {
        // Verify the order belongs to a truck owned by this user and get current status
        const orderCheck = await db.query(
            `SELECT o.orderid, o.orderstatus
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.orderid = $1 AND t.ownerid = $2`,
            [orderId, req.user.userid]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or does not belong to your truck' });
        }

        const currentStatus = orderCheck.rows[0].orderstatus;

        // Prevent updating cancelled orders
        if (currentStatus === 'cancelled') {
            return res.status(400).json({ error: 'Cannot update a cancelled order' });
        }

        // Prevent updating completed orders
        if (currentStatus === 'completed') {
            return res.status(400).json({ error: 'Cannot update a completed order' });
        }

        // Update order status (and optionally estimatedEarliestPickup)
        let updateQuery, updateParams;
        if (estimatedEarliestPickup) {
            updateQuery = `UPDATE foodtruck.orders 
                          SET orderstatus = $1, estimatedearliestpickup = $2 
                          WHERE orderid = $3`;
            updateParams = [orderStatus, estimatedEarliestPickup, orderId];
        } else {
            updateQuery = `UPDATE foodtruck.orders 
                          SET orderstatus = $1 
                          WHERE orderid = $2`;
            updateParams = [orderStatus, orderId];
        }

        await db.query(updateQuery, updateParams);

        res.status(200).json({ message: 'order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/order/truckOwner/:orderId - View order details for truck owner (user story)
router.get('/order/truckOwner/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        // Get truck owner's truck
        const truckResult = await db.query(
            'SELECT truckid FROM foodtruck.trucks WHERE ownerid = $1 LIMIT 1',
            [req.user.userid]
        );

        if (truckResult.rows.length === 0) {
            return res.status(404).json({ error: 'No truck found for this owner' });
        }

        const truckId = truckResult.rows[0].truckid;

        // Get order details and verify it belongs to this truck
        const orderResult = await db.query(
            `SELECT 
                o.orderid AS "orderId",
                t.truckname AS "truckName",
                u.name AS "customerName",
                u.email AS "customerEmail",
                o.orderstatus AS "orderStatus",
                o.totalprice AS "totalPrice",
                o.scheduledpickuptime AS "scheduledPickupTime",
                o.estimatedearliestpickup AS "estimatedEarliestPickup",
                o.createdat AS "createdAt"
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             JOIN foodtruck.users u ON o.userid = u.userid
             WHERE o.orderid = $1 AND o.truckid = $2`,
            [orderId, truckId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or does not belong to your truck' });
        }

        const orderDetails = orderResult.rows[0];

        // Get order items
        const itemsResult = await db.query(
            `SELECT 
                m.name AS "itemName",
                oi.quantity,
                oi.price AS "priceAtOrder"
             FROM foodtruck.orderitems oi
             JOIN foodtruck.menuitems m ON oi.itemid = m.itemid
             WHERE oi.orderid = $1`,
            [orderId]
        );

        orderDetails.items = itemsResult.rows;

        res.status(200).json(orderDetails);
    } catch (error) {
        console.error('Error fetching order details for truck owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/orders - Get user's orders
router.get('/orders', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.orderid, o.userid, o.truckid, o.orderstatus, o.totalprice,
                    o.scheduledpickuptime, o.estimatedearliestpickup, o.createdat,
                    t.truckname, t.trucklogo
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.userid = $1
             ORDER BY o.createdat DESC`,
            [req.user.userid]
        );

        res.json({ orders: result.rows });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/orders/:orderid - Get order details with items
router.get('/orders/:orderid', async (req, res) => {
    const { orderid } = req.params;

    try {
        // Get order details
        const orderResult = await db.query(
            `SELECT o.orderid, o.userid, o.truckid, o.orderstatus, o.totalprice,
                    o.scheduledpickuptime, o.estimatedearliestpickup, o.createdat,
                    t.truckname, t.trucklogo
             FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.orderid = $1 AND o.userid = $2`,
            [orderid, req.user.userid]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get order items
        const itemsResult = await db.query(
            `SELECT oi.orderitemid, oi.orderid, oi.itemid, oi.quantity, oi.price,
                    m.name, m.description, m.category
             FROM foodtruck.orderitems oi
             JOIN foodtruck.menuitems m ON oi.itemid = m.itemid
             WHERE oi.orderid = $1`,
            [orderid]
        );

        res.json({
            order: orderResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/orders - Create order from cart
router.post('/orders', async (req, res) => {
    const { scheduledpickuptime } = req.body;

    try {
        // Get cart items
        const cartResult = await db.query(
            `SELECT c.*, m.truckid 
             FROM foodtruck.carts c
             JOIN foodtruck.menuitems m ON c.itemid = m.itemid
             WHERE c.userid = $1`,
            [req.user.userid]
        );

        if (cartResult.rows.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Check if all items are from the same truck
        const truckids = [...new Set(cartResult.rows.map(item => item.truckid))];
        if (truckids.length > 1) {
            return res.status(400).json({ error: 'Cart items must be from the same truck' });
        }

        const truckid = truckids[0];
        const totalprice = cartResult.rows.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        const estimatedearliestpickup = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        // Create order
        const orderResult = await db.query(
            `INSERT INTO foodtruck.orders (userid, truckid, orderstatus, totalprice, scheduledpickuptime, estimatedearliestpickup)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.userid, truckid, 'pending', totalprice, scheduledpickuptime || estimatedearliestpickup, estimatedearliestpickup]
        );

        const order = orderResult.rows[0];

        // Create order items
        for (const cartItem of cartResult.rows) {
            await db.query(
                'INSERT INTO foodtruck.orderitems (orderid, itemid, quantity, price) VALUES ($1, $2, $3, $4)',
                [order.orderid, cartItem.itemid, cartItem.quantity, cartItem.price]
            );
        }

        // Clear cart
        await db.query('DELETE FROM foodtruck.carts WHERE userid = $1', [req.user.userid]);

        res.status(201).json({ 
            message: 'Order created successfully', 
            order: order 
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// TRUCK OWNER ROUTES
// ============================================

// GET /api/mytrucks - Get trucks owned by user
router.get('/mytrucks', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT truckid, truckname, trucklogo, ownerid, truckstatus, orderstatus, createdat
             FROM foodtruck.trucks
             WHERE ownerid = $1
             ORDER BY truckid ASC`,
            [req.user.userid]
        );

        res.json({ trucks: result.rows });
    } catch (error) {
        console.error('Error fetching my trucks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/trucks - Create a new truck (truck owner only)
router.post('/trucks', async (req, res) => {
    if (req.user.role !== 'truckowner') {
        return res.status(403).json({ error: 'Only truck owners can create trucks' });
    }

    const { truckname, trucklogo } = req.body;

    if (!truckname) {
        return res.status(400).json({ error: 'Truck name is required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO foodtruck.trucks (truckname, trucklogo, ownerid, truckstatus, orderstatus)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [truckname, trucklogo, req.user.userid, 'available', 'available']
        );

        res.status(201).json({ 
            message: 'Truck created successfully', 
            truck: result.rows[0] 
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Truck with this name already exists' });
        }
        console.error('Error creating truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/myTruck - View my truck information (user story)
// IMPORTANT: This route must come before /api/trucks/:truckid to avoid "myTruck" being treated as truckid
router.get('/trucks/myTruck', async (req, res) => {
    try {
        // Get all trucks for the truck owner
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
             WHERE ownerid = $1
             ORDER BY truckid ASC`,
            [req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No trucks found for this owner' });
        }

        // Return array of all trucks
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching truck information:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/trucks/updateOrderStatus - Update truck order availability (user story)
// IMPORTANT: This route must come before /api/trucks/:truckid to avoid "updateOrderStatus" being treated as truckid
router.put('/trucks/updateOrderStatus', async (req, res) => {
    const { orderStatus, truckId } = req.body;

    // Validate orderStatus
    const validStatuses = ['available', 'unavailable'];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
        return res.status(400).json({ error: 'Valid orderStatus is required (available or unavailable)' });
    }

    if (!truckId) {
        return res.status(400).json({ error: 'truckId is required' });
    }

    try {
        // Verify truck ownership
        const truckCheck = await db.query(
            'SELECT truckid FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckId, req.user.userid]
        );

        if (truckCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        // Update truck order status
        await db.query(
            'UPDATE foodtruck.trucks SET orderstatus = $1 WHERE truckid = $2',
            [orderStatus, truckId]
        );

        res.status(200).json({ message: 'truck order status updated successfully' });
    } catch (error) {
        console.error('Error updating truck order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/trucks/:truckid - Update truck
router.put('/trucks/:truckid', async (req, res) => {
    const { truckid } = req.params;
    const { truckname, trucklogo, orderstatus } = req.body;

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        // Truck owners cannot modify truckstatus - only admins can
        const result = await db.query(
            `UPDATE foodtruck.trucks 
             SET truckname = COALESCE($1, truckname),
                 trucklogo = COALESCE($2, trucklogo),
                 orderstatus = COALESCE($3, orderstatus)
             WHERE truckid = $4 AND ownerid = $5
             RETURNING *`,
            [truckname, trucklogo, orderstatus, truckid, req.user.userid]
        );

        res.json({ 
            message: 'Truck updated successfully', 
            truck: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/trucks/:truckid - Delete truck
router.delete('/trucks/:truckid', async (req, res) => {
    const { truckid } = req.params;

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        // Delete menu items first (due to foreign key constraint)
        await db.query(
            'DELETE FROM foodtruck.menuitems WHERE truckid = $1',
            [truckid]
        );

        // Delete the truck
        await db.query(
            'DELETE FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        res.json({ message: 'Truck deleted successfully' });
    } catch (error) {
        console.error('Error deleting truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/:truckid/menu - Get menu items for owned truck
router.get('/trucks/:truckid/menu', async (req, res) => {
    const { truckid } = req.params;

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        const result = await db.query(
            `SELECT itemid, truckid, name, description, price, category, status, createdat
             FROM foodtruck.menuitems
             WHERE truckid = $1
             ORDER BY category, name`,
            [truckid]
        );

        res.json({ menuItems: result.rows });
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/trucks/:truckid/menu - Add menu item
router.post('/trucks/:truckid/menu', async (req, res) => {
    const { truckid } = req.params;
    const { name, description, price, category } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        const result = await db.query(
            `INSERT INTO foodtruck.menuitems (truckid, name, description, price, category, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [truckid, name, description, price, category, 'available']
        );

        res.status(201).json({ 
            message: 'Menu item added successfully', 
            menuItem: result.rows[0] 
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/menuItem/new - Add menu item (alternative endpoint as per user story)
router.post('/menuItem/new', async (req, res) => {
    const { name, description, price, category, truckid } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    try {
        let selectedTruckId = truckid;

        // If no truckid provided, get user's first truck (getUser function retrieves current truck owner's truckId)
        if (!selectedTruckId) {
            const truckResult = await db.query(
                'SELECT truckid FROM foodtruck.trucks WHERE ownerid = $1 LIMIT 1',
                [req.user.userid]
            );

            if (truckResult.rows.length === 0) {
                return res.status(404).json({ error: 'No truck found for this owner. Please create a truck first.' });
            }

            selectedTruckId = truckResult.rows[0].truckid;
        } else {
            // Verify truck ownership if truckid is provided
            const ownerCheck = await db.query(
                'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
                [selectedTruckId, req.user.userid]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(403).json({ error: 'You do not own this truck' });
            }
        }

        // Insert menu item with default status and createdAt
        const result = await db.query(
            `INSERT INTO foodtruck.menuitems (truckid, name, description, price, category)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [selectedTruckId, name, description, price, category]
        );

        res.status(200).json({ 
            message: 'menu item was created successfully'
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/menu/:itemid - Update menu item
router.put('/menu/:itemid', async (req, res) => {
    const { itemid } = req.params;
    const { name, description, price, category, status } = req.body;

    try {
        // Check ownership through truck
        const ownerCheck = await db.query(
            `SELECT m.* FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.itemid = $1 AND t.ownerid = $2`,
            [itemid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or you do not own this truck' });
        }

        const result = await db.query(
            `UPDATE foodtruck.menuitems 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 price = COALESCE($3, price),
                 category = COALESCE($4, category),
                 status = COALESCE($5, status)
             WHERE itemid = $6
             RETURNING *`,
            [name, description, price, category, status, itemid]
        );

        res.json({ 
            message: 'Menu item updated successfully', 
            menuItem: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/menu/:itemid - Delete menu item
router.delete('/menu/:itemid', async (req, res) => {
    const { itemid } = req.params;

    try {
        // Check ownership through truck
        const ownerCheck = await db.query(
            `SELECT m.* FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.itemid = $1 AND t.ownerid = $2`,
            [itemid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or you do not own this truck' });
        }

        await db.query('DELETE FROM foodtruck.menuitems WHERE itemid = $1', [itemid]);

        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/menuItem/view - View my truck's menu items (user story)
router.get('/menuItem/view', async (req, res) => {
    try {
        // Get all trucks owned by current user (getUser function retrieves current truck owner's truckId)
        const trucksResult = await db.query(
            'SELECT truckid FROM foodtruck.trucks WHERE ownerid = $1',
            [req.user.userid]
        );

        if (trucksResult.rows.length === 0) {
            return res.status(200).json([]);
        }

        // Get all truckIds owned by user
        const truckIds = trucksResult.rows.map(row => row.truckid);

        // Get all menu items for user's trucks where status is 'available'
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
             WHERE truckid = ANY($1) AND status = 'available'
             ORDER BY itemid ASC`,
            [truckIds]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/menuItem/view/:itemId - View a specific menu item (user story)
router.get('/menuItem/view/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        // Get menu item and verify ownership through truck
        const result = await db.query(
            `SELECT 
                m.itemid AS "itemId",
                m.truckid AS "truckId",
                m.name,
                m.description,
                m.price,
                m.category,
                m.status,
                m.createdat AS "createdAt"
             FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.itemid = $1 AND t.ownerid = $2`,
            [itemId, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or you do not own this truck' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/menuItem/edit/:itemId - Edit a menu item (user story)
router.put('/menuItem/edit/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { name, price, category, description } = req.body;

    try {
        // Verify ownership through truck (getUser function retrieves current truck owner's truckId)
        const ownerCheck = await db.query(
            `SELECT m.* FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.itemid = $1 AND t.ownerid = $2`,
            [itemId, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or you do not own this truck' });
        }

        // Update only name, price, category, and description
        const result = await db.query(
            `UPDATE foodtruck.menuitems 
             SET name = COALESCE($1, name),
                 price = COALESCE($2, price),
                 category = COALESCE($3, category),
                 description = COALESCE($4, description)
             WHERE itemid = $5
             RETURNING *`,
            [name, price, category, description, itemId]
        );

        res.status(200).json({ 
            message: 'menu item updated successfully'
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/menuItem/delete/:itemId - Delete a menu item (user story - soft delete)
router.delete('/menuItem/delete/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        // Verify ownership through truck (getUser function retrieves current truck owner's truckId)
        const ownerCheck = await db.query(
            `SELECT m.* FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.itemid = $1 AND t.ownerid = $2`,
            [itemId, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found or you do not own this truck' });
        }

        // Soft delete: Update status to "unavailable"
        await db.query(
            `UPDATE foodtruck.menuitems 
             SET status = 'unavailable'
             WHERE itemid = $1`,
            [itemId]
        );

        res.status(200).json({ 
            message: 'menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/trucks/:truckid/orders - Get orders for owned truck
router.get('/trucks/:truckid/orders', async (req, res) => {
    const { truckid } = req.params;

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        const result = await db.query(
            `SELECT o.orderid, o.userid, o.truckid, o.orderstatus, o.totalprice,
                    o.scheduledpickuptime, o.estimatedearliestpickup, o.createdat,
                    u.name as customername, u.email as customeremail
             FROM foodtruck.orders o
             JOIN foodtruck.users u ON o.userid = u.userid
             WHERE o.truckid = $1
             ORDER BY o.createdat DESC`,
            [truckid]
        );

        res.json({ orders: result.rows });
    } catch (error) {
        console.error('Error fetching truck orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/orders/:orderid/status - Update order status
router.put('/orders/:orderid/status', async (req, res) => {
    const { orderid } = req.params;
    const { orderstatus } = req.body;

    if (!orderstatus) {
        return res.status(400).json({ error: 'Order status is required' });
    }

    try {
        // Check ownership through truck
        const ownerCheck = await db.query(
            `SELECT o.* FROM foodtruck.orders o
             JOIN foodtruck.trucks t ON o.truckid = t.truckid
             WHERE o.orderid = $1 AND t.ownerid = $2`,
            [orderid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or you do not own this truck' });
        }

        const result = await db.query(
            'UPDATE foodtruck.orders SET orderstatus = $1 WHERE orderid = $2 RETURNING *',
            [orderstatus, orderid]
        );

        res.json({ 
            message: 'Order status updated successfully', 
            order: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// USERS CRUD (Self Management)
// ============================================

// GET /api/users/me - Get current user profile
router.get('/users/me', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT userid, name, email, role, birthdate, createdat FROM foodtruck.users WHERE userid = $1',
            [req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/users/me - Update current user profile
router.put('/users/me', async (req, res) => {
    const { name, email, password, birthdate } = req.body;

    try {
        // Hash password if provided
        let hashedPassword = null;
        if (password) {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(password, saltRounds);
        }

        const result = await db.query(
            `UPDATE foodtruck.users 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 password = COALESCE($3, password),
                 birthdate = COALESCE($4, birthdate)
             WHERE userid = $5
             RETURNING userid, name, email, role, birthdate, createdat`,
            [name, email, hashedPassword, birthdate, req.user.userid]
        );

        res.json({ 
            message: 'Profile updated successfully', 
            user: result.rows[0] 
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/users/me - Delete current user account
router.delete('/users/me', async (req, res) => {
    try {
        await db.query('DELETE FROM foodtruck.users WHERE userid = $1', [req.user.userid]);
        res.clearCookie('token');
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ORDERITEMS CRUD
// ============================================

// GET /api/orderitems/:orderid - Get all items for a specific order
router.get('/orderitems/:orderid', async (req, res) => {
    const { orderid } = req.params;

    try {
        // Verify order belongs to user
        const orderCheck = await db.query(
            'SELECT * FROM foodtruck.orders WHERE orderid = $1 AND userid = $2',
            [orderid, req.user.userid]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const result = await db.query(
            `SELECT oi.orderitemid, oi.orderid, oi.itemid, oi.quantity, oi.price,
                    m.name, m.description, m.category
             FROM foodtruck.orderitems oi
             JOIN foodtruck.menuitems m ON oi.itemid = m.itemid
             WHERE oi.orderid = $1`,
            [orderid]
        );

        res.json({ orderItems: result.rows });
    } catch (error) {
        console.error('Error fetching order items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// TRUCKS CRUD (Complete CRUD)
// ============================================

// DELETE /api/trucks/:truckid - Delete truck
router.delete('/trucks/:truckid', async (req, res) => {
    const { truckid } = req.params;

    try {
        // Check ownership
        const ownerCheck = await db.query(
            'SELECT * FROM foodtruck.trucks WHERE truckid = $1 AND ownerid = $2',
            [truckid, req.user.userid]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found or you do not own this truck' });
        }

        await db.query('DELETE FROM foodtruck.trucks WHERE truckid = $1', [truckid]);

        res.json({ message: 'Truck deleted successfully' });
    } catch (error) {
        console.error('Error deleting truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// SESSIONS CRUD
// ============================================

// GET /api/sessions - Get all active sessions for current user
router.get('/sessions', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, userid, expiresat FROM foodtruck.sessions WHERE userid = $1 AND expiresat > NOW()',
            [req.user.userid]
        );

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/sessions/:sessionid - Delete specific session
router.delete('/sessions/:sessionid', async (req, res) => {
    const { sessionid } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM foodtruck.sessions WHERE id = $1 AND userid = $2 RETURNING *',
            [sessionid, req.user.userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/sessions - Delete all sessions for current user (logout from all devices)
router.delete('/sessions', async (req, res) => {
    try {
        await db.query('DELETE FROM foodtruck.sessions WHERE userid = $1', [req.user.userid]);
        res.clearCookie('token');
        res.json({ message: 'All sessions deleted successfully' });
    } catch (error) {
        console.error('Error deleting sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// GET /api/admin/stats - Get dashboard statistics
router.get('/admin/stats', isAdmin, async (req, res) => {
    try {
        const usersCount = await db.query('SELECT COUNT(*) FROM foodtruck.users WHERE role != $1', ['admin']);
        const trucksCount = await db.query('SELECT COUNT(*) FROM foodtruck.trucks');
        const ordersCount = await db.query('SELECT COUNT(*) FROM foodtruck.orders');
        const customersCount = await db.query('SELECT COUNT(*) FROM foodtruck.users WHERE role = $1', ['customer']);
        const ownersCount = await db.query('SELECT COUNT(*) FROM foodtruck.users WHERE role = $1 AND status = $2', ['truckowner', 'active']);
        const pendingCount = await db.query('SELECT COUNT(*) FROM foodtruck.users WHERE role = $1 AND status = $2', ['truckowner', 'pending']);

        res.json({
            totalUsers: parseInt(usersCount.rows[0].count),
            totalTrucks: parseInt(trucksCount.rows[0].count),
            totalOrders: parseInt(ordersCount.rows[0].count),
            totalCustomers: parseInt(customersCount.rows[0].count),
            totalOwners: parseInt(ownersCount.rows[0].count),
            pendingApprovals: parseInt(pendingCount.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/users - Get all users
router.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT userid, name, email, role, status, birthdate, createdat
             FROM foodtruck.users
             WHERE role != 'admin'
             ORDER BY createdat DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/trucks - Get all trucks with owner info
router.get('/admin/trucks', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.truckid, t.truckname, t.trucklogo, t.truckstatus, t.orderstatus, t.createdat,
                    u.userid AS ownerid, u.name AS ownername, u.email AS owneremail, u.status AS ownerstatus
             FROM foodtruck.trucks t
             JOIN foodtruck.users u ON t.ownerid = u.userid
             ORDER BY t.createdat DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching trucks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/users/:userid/status - Update user status (activate/deactivate)
router.put('/admin/users/:userid/status', isAdmin, async (req, res) => {
    const { userid } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required (active or inactive)' });
    }

    try {
        // Check if user exists and is not admin
        const userCheck = await db.query(
            'SELECT userid, role FROM foodtruck.users WHERE userid = $1',
            [userid]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userCheck.rows[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot modify admin users' });
        }

        // Update user status
        await db.query(
            'UPDATE foodtruck.users SET status = $1 WHERE userid = $2',
            [status, userid]
        );

        // If deactivating a truck owner, also deactivate their trucks
        if (status === 'inactive' && userCheck.rows[0].role === 'truckowner') {
            await db.query(
                `UPDATE foodtruck.trucks 
                 SET truckstatus = 'inactive', orderstatus = 'inactive' 
                 WHERE ownerid = $1`,
                [userid]
            );
        }

        // If reactivating a truck owner, also reactivate their trucks
        if (status === 'active' && userCheck.rows[0].role === 'truckowner') {
            await db.query(
                `UPDATE foodtruck.trucks 
                 SET truckstatus = 'available', orderstatus = 'available' 
                 WHERE ownerid = $1`,
                [userid]
            );
        }

        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/users/:userid - Delete user
router.delete('/admin/users/:userid', isAdmin, async (req, res) => {
    const { userid } = req.params;

    try {
        // Check if user exists and is not admin
        const userCheck = await db.query(
            'SELECT userid, role FROM foodtruck.users WHERE userid = $1',
            [userid]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userCheck.rows[0].role === 'admin') {
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        // If truck owner, delete their trucks first (cascade will handle menu items)
        if (userCheck.rows[0].role === 'truckowner') {
            await db.query('DELETE FROM foodtruck.trucks WHERE ownerid = $1', [userid]);
        }

        // Delete user's sessions, carts, and orders
        await db.query('DELETE FROM foodtruck.sessions WHERE userid = $1', [userid]);
        await db.query('DELETE FROM foodtruck.carts WHERE userid = $1', [userid]);
        
        // Delete user
        await db.query('DELETE FROM foodtruck.users WHERE userid = $1', [userid]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/trucks/:truckid/status - Update truck status
router.put('/admin/trucks/:truckid/status', isAdmin, async (req, res) => {
    const { truckid } = req.params;
    const { truckstatus } = req.body;

    if (!truckstatus || !['available', 'inactive'].includes(truckstatus)) {
        return res.status(400).json({ error: 'Valid truckstatus is required (available or inactive)' });
    }

    try {
        const result = await db.query(
            'UPDATE foodtruck.trucks SET truckstatus = $1, orderstatus = $1 WHERE truckid = $2 RETURNING *',
            [truckstatus, truckid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found' });
        }

        res.json({ message: 'Truck status updated successfully' });
    } catch (error) {
        console.error('Error updating truck status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/trucks/:truckid/menu - Get menu items for a truck (admin)
router.get('/admin/trucks/:truckid/menu', isAdmin, async (req, res) => {
    const { truckid } = req.params;

    try {
        const result = await db.query(
            `SELECT m.itemid, m.name, m.description, m.price, m.category, m.status, m.createdat,
                    t.truckname, t.truckid
             FROM foodtruck.menuitems m
             JOIN foodtruck.trucks t ON m.truckid = t.truckid
             WHERE m.truckid = $1
             ORDER BY m.category, m.name`,
            [truckid]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/trucks/:truckid - Delete truck
router.delete('/admin/trucks/:truckid', isAdmin, async (req, res) => {
    const { truckid } = req.params;

    try {
        // Delete truck (cascade will handle menu items)
        const result = await db.query(
            'DELETE FROM foodtruck.trucks WHERE truckid = $1 RETURNING *',
            [truckid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Truck not found' });
        }

        res.json({ message: 'Truck deleted successfully' });
    } catch (error) {
        console.error('Error deleting truck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ADMIN - PENDING APPROVALS ROUTES
// ============================================

// GET /api/admin/pending - Get all pending truck owner registrations
router.get('/admin/pending', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.userid, u.name, u.email, u.role, u.birthdate, u.createdat, u.status,
                    t.truckid, t.truckname, t.truckstatus
             FROM foodtruck.users u
             LEFT JOIN foodtruck.trucks t ON u.userid = t.ownerid
             WHERE u.status = 'pending' AND u.role = 'truckowner'
             ORDER BY u.createdat DESC`
        );

        res.json({ pendingUsers: result.rows });
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/pending/:userid/approve - Approve pending truck owner
router.put('/admin/pending/:userid/approve', isAdmin, async (req, res) => {
    const { userid } = req.params;

    try {
        // Approve user
        const result = await db.query(
            `UPDATE foodtruck.users 
             SET status = 'active' 
             WHERE userid = $1 AND status = 'pending' AND role = 'truckowner'
             RETURNING userid, name, email, role, status`,
            [userid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pending user not found' });
        }

        // Also approve their truck (set truckstatus to 'active')
        await db.query(
            `UPDATE foodtruck.trucks 
             SET truckstatus = 'active' 
             WHERE ownerid = $1 AND truckstatus = 'pending'`,
            [userid]
        );

        res.json({ 
            message: 'Truck owner and truck approved successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/pending/:userid/reject - Reject pending truck owner
router.put('/admin/pending/:userid/reject', isAdmin, async (req, res) => {
    const { userid } = req.params;

    try {
        // Check if user exists and is pending
        const userCheck = await db.query(
            `SELECT userid, name, email FROM foodtruck.users 
             WHERE userid = $1 AND status = 'pending' AND role = 'truckowner'`,
            [userid]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Pending user not found' });
        }

        // Clean up all related data in the correct order
        
        // 1. Delete sessions
        await db.query('DELETE FROM foodtruck.sessions WHERE userid = $1', [userid]);
        
        // 2. Delete carts
        await db.query('DELETE FROM foodtruck.carts WHERE userid = $1', [userid]);
        
        // 3. Delete orders (CASCADE will handle orderitems)
        await db.query('DELETE FROM foodtruck.orders WHERE userid = $1', [userid]);
        
        // 4. Delete trucks (CASCADE will handle menuitems, and any orders/carts referencing menuitems)
        await db.query('DELETE FROM foodtruck.trucks WHERE ownerid = $1', [userid]);
        
        // 5. Finally delete the user
        await db.query('DELETE FROM foodtruck.users WHERE userid = $1', [userid]);

        res.json({ 
            message: 'Truck owner registration rejected and removed',
            user: userCheck.rows[0]
        });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/order/cancel/:orderId - Cancel an order
router.post('/order/cancel/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        // Get order details and verify it belongs to current user
        const orderResult = await db.query(
            `SELECT o.orderid, o.orderstatus, o.createdat
             FROM foodtruck.orders o
             WHERE o.orderid = $1 AND o.userid = $2`,
            [orderId, req.user.userid]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or does not belong to you' });
        }

        const order = orderResult.rows[0];

        // Check if order can be cancelled
        if (order.orderstatus === 'cancelled') {
            return res.status(400).json({ error: 'Order is already cancelled' });
        }

        if (order.orderstatus === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel a completed order' });
        }

        if (order.orderstatus === 'ready') {
            return res.status(400).json({ error: 'Cannot cancel an order that is ready for pickup' });
        }

        // Check time constraint (10 minutes after order creation)
        const orderTime = new Date(order.createdat);
        const currentTime = new Date();
        const timeDifference = (currentTime - orderTime) / 1000 / 60; // in minutes

        if (timeDifference > 10 && order.orderstatus === 'preparing') {
            return res.status(400).json({ error: 'Cannot cancel order after 10 minutes when it is being prepared' });
        }

        // Update order status to cancelled
        const updateResult = await db.query(
            `UPDATE foodtruck.orders 
             SET orderstatus = 'cancelled' 
             WHERE orderid = $1 
             RETURNING orderid, orderstatus`,
            [orderId]
        );

        res.status(200).json({ 
            message: 'Order cancelled successfully',
            order: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
