const express = require('express');
const path = require('path');
const adminRoutes = require('./modules/admin/adminRoute');

const app = express();

// Parse JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Use admin routes
app.use('/', adminRoutes);

// Start server
app.listen(5000, () => console.log('Server running on http://localhost:5000'));