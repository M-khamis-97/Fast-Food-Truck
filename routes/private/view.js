const express = require('express');
const router = express.Router();

// GET /dashboard - Customer homepage
router.get('/dashboard', (req, res) => {
    res.render('customerHomepage', { 
        title: 'Dashboard - GIU Food Truck',
        user: req.user
    });
});

// GET /trucks - Browse trucks page
router.get('/trucks', (req, res) => {
    res.render('trucks', { 
        title: 'Browse Trucks - GIU Food Truck',
        user: req.user
    });
});

// GET /truckMenu/:truckId - Truck menu page
router.get('/truckMenu/:truckId', (req, res) => {
    res.render('truckMenu', { 
        title: 'Truck Menu - GIU Food Truck',
        user: req.user,
        truckId: req.params.truckId
    });
});

// GET /cart - Shopping cart page
router.get('/cart', (req, res) => {
    res.render('cart', { 
        title: 'Shopping Cart - GIU Food Truck',
        user: req.user
    });
});

// GET /myOrders - Customer orders page
router.get('/myOrders', (req, res) => {
    res.render('myOrders', { 
        title: 'My Orders - GIU Food Truck',
        user: req.user
    });
});

// GET /ownerDashboard - Truck owner dashboard
router.get('/ownerDashboard', (req, res) => {
    res.render('ownerDashboard', { 
        title: 'Owner Dashboard - GIU Food Truck',
        user: req.user
    });
});

// GET /menuItems - Menu items management
router.get('/menuItems', (req, res) => {
    res.render('menuItems', { 
        title: 'Manage Menu Items - GIU Food Truck',
        user: req.user
    });
});

// GET /addMenuItem - Add menu item page
router.get('/addMenuItem', (req, res) => {
    res.render('addMenuItem', { 
        title: 'Add Menu Item - GIU Food Truck',
        user: req.user
    });
});

// GET /truckOrders - Truck orders page
router.get('/truckOrders', (req, res) => {
    res.render('truckOrders', { 
        title: 'Truck Orders - GIU Food Truck',
        user: req.user
    });
});

// GET /adminDashboard - Admin dashboard
router.get('/adminDashboard', (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect('/dashboard');
    }
    res.render('adminDashboard', { 
        title: 'Admin Dashboard - GIU Food Truck',
        user: req.user
    });
});

module.exports = router;
