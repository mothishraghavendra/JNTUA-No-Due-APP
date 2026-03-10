const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../../config/db");
const { generateNoDueCertificate } = require("../../utils/generatePDF");

const router = express.Router();

// Unified login - determines user type automatically
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const [users] = await pool.query(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Normalize role for checking
        const roleCheck = user.role.toLowerCase().trim();
        const isAdminRole = roleCheck === 'admin' || roleCheck === 'superadmin';

        // Check if account is active (except for admin who might not need activation)
        if (!user.is_active && !isAdminRole) {
            return res.status(401).json({ error: 'Account not activated. Please set your password first.' });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`User logged in: ${user.email} (${user.role})`);

        // Normalize role for comparison (handle variations like 'Admin', 'ADMIN', 'superadmin')
        const normalizedRole = user.role.toLowerCase().trim();
        const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';
        const isOfficer = normalizedRole === 'officer';

        // Build response based on role
        if (isAdmin) {
            res.json({
                success: true,
                role: 'admin',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } else if (isOfficer) {
            // Get department info for officer
            const [depts] = await pool.query(
                `SELECT id, name FROM departments WHERE officer_id = ?`,
                [user.id]
            );

            const dept = depts[0] || {};

            res.json({
                success: true,
                role: 'officer',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department_id: dept.id,
                    department_name: dept.name
                }
            });
        } else {
            // Student
            res.json({
                success: true,
                role: 'student',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    branch: user.branch,
                    admission_number: user.admission_number
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Student login (legacy - kept for compatibility)
router.post('/student/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            `SELECT * FROM users WHERE email = ? AND role = 'student'`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'No student found with this email' });
        }

        const student = rows[0];

        if (!student.is_active) {
            return res.status(401).json({ error: 'Account not activated. Please set your password first.' });
        }

        const valid = await bcrypt.compare(password, student.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`Student logged in: ${student.email}`);
        
        // Return student info (in production, use JWT tokens)
        res.json({
            success: true,
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                branch: student.branch,
                admission_number: student.admission_number
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get student's application status
router.get('/student/application-status', async (req, res) => {
    try {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID required' });
        }

        // Get latest application for this student
        const [applications] = await pool.query(
            `SELECT a.*, 
                    (SELECT COUNT(*) FROM approvals WHERE application_id = a.id AND status = 'approved') as approved_count,
                    (SELECT COUNT(*) FROM approvals WHERE application_id = a.id AND status = 'pending') as pending_count,
                    (SELECT COUNT(*) FROM approvals WHERE application_id = a.id AND status = 'rejected') as rejected_count
             FROM applications a 
             WHERE a.student_id = ? 
             ORDER BY a.applied_at DESC 
             LIMIT 1`,
            [studentId]
        );

        if (applications.length === 0) {
            return res.json({ hasApplication: false });
        }

        const application = applications[0];

        // Get all approval statuses
        const [approvals] = await pool.query(
            `SELECT ap.*, d.name as department_name 
             FROM approvals ap
             JOIN departments d ON ap.department_id = d.id
             WHERE ap.application_id = ?`,
            [application.id]
        );

        res.json({
            hasApplication: true,
            application: {
                id: application.id,
                status: application.status,
                applied_at: application.applied_at,
                completed_at: application.completed_at,
                approved_count: application.approved_count,
                pending_count: application.pending_count,
                rejected_count: application.rejected_count
            },
            approvals
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get application status' });
    }
});

// Raise no-due request
router.post('/student/raise-nodue', async (req, res) => {
    try {
        const { studentId, departments } = req.body;

        if (!studentId || !departments || departments.length === 0) {
            return res.status(400).json({ error: 'Student ID and departments are required' });
        }

        // Check if student already has a pending application
        const [existingApps] = await pool.query(
            `SELECT * FROM applications WHERE student_id = ? AND status = 'pending'`,
            [studentId]
        );

        if (existingApps.length > 0) {
            return res.status(400).json({ error: 'You already have a pending application' });
        }

        // Create application
        const [appResult] = await pool.query(
            `INSERT INTO applications (student_id, status) VALUES (?, 'pending')`,
            [studentId]
        );

        const applicationId = appResult.insertId;

        // Get department IDs and create approval entries
        for (const deptName of departments) {
            // Find or get department ID
            const [depts] = await pool.query(
                `SELECT id FROM departments WHERE name = ?`,
                [deptName]
            );

            let departmentId;
            if (depts.length === 0) {
                // Create department if doesn't exist
                const [newDept] = await pool.query(
                    `INSERT INTO departments (name, type) VALUES (?, 'COMMON')`,
                    [deptName]
                );
                departmentId = newDept.insertId;
            } else {
                departmentId = depts[0].id;
            }

            // Create approval entry
            await pool.query(
                `INSERT INTO approvals (application_id, department_id, status) VALUES (?, ?, 'pending')`,
                [applicationId, departmentId]
            );
        }

        res.json({
            success: true,
            message: 'No-due request raised successfully',
            applicationId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to raise no-due request' });
    }
});

// Download No Due Certificate PDF
router.get('/student/download-certificate', async (req, res) => {
    try {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID required' });
        }

        // Get student info
        const [students] = await pool.query(
            `SELECT * FROM users WHERE id = ? AND role = 'student'`,
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = students[0];

        // Get latest completed application
        const [applications] = await pool.query(
            `SELECT * FROM applications 
             WHERE student_id = ? AND status = 'completed'
             ORDER BY completed_at DESC 
             LIMIT 1`,
            [studentId]
        );

        if (applications.length === 0) {
            return res.status(400).json({ error: 'No completed application found. All departments must approve before certificate can be generated.' });
        }

        const application = applications[0];

        // Get all approved departments
        const [approvals] = await pool.query(
            `SELECT d.name as department_name 
             FROM approvals ap
             JOIN departments d ON ap.department_id = d.id
             WHERE ap.application_id = ? AND ap.status = 'approved'`,
            [application.id]
        );

        const departmentNames = approvals.map(a => a.department_name);

        // Generate PDF
        const pdfDoc = generateNoDueCertificate({
            studentName: student.name,
            admissionNumber: student.admission_number,
            branch: student.branch,
            completedDate: application.completed_at,
            departments: departmentNames
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="NoDueCertificate_${student.admission_number || student.id}.pdf"`);

        // Pipe PDF to response
        pdfDoc.pipe(res);
        pdfDoc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
});

module.exports = router;
