const express = require('express');
const router = express.Router();

// GET / - Login page
router.get('/', (req, res) => {
    res.render('login', { title: 'Login - GIU Food Truck' });
});

// GET /register - Register page
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register - GIU Food Truck' });
});

module.exports = router;
