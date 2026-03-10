const express = require('express');
const path = require('path');
const adminRoutes = require('./modules/admin/adminRoute');
const studentRoutes = require('./modules/auth/studentRoute');
const departmentRoutes = require('./modules/department/departmentRoute');

const app = express();

// Parse JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Use routes
app.use('/', adminRoutes);
app.use('/', studentRoutes);
app.use('/', departmentRoutes);

// Start server
app.listen(5000, () => console.log('Server running on http://localhost:5000/login.html'));