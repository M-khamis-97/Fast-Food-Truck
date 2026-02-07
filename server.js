const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { authMiddleware } = require('./middleware/auth');
const publicApiRoutes = require('./routes/public/api');
const privateApiRoutes = require('./routes/private/api');
const publicViewRoutes = require('./routes/public/view');
const privateViewRoutes = require('./routes/private/view');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'hjs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Public view routes (no authentication required)
app.use('/', publicViewRoutes);

// Public API routes (no authentication required)
app.use('/api/v1', publicApiRoutes);

// Private view routes (authentication required)
app.use('/', authMiddleware, privateViewRoutes);

// Private API routes (authentication required)
app.use('/api/v1', authMiddleware, privateApiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
