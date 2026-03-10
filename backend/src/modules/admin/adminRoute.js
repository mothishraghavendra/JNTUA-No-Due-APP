const express = require("express");
const crypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const XLSX = require("xlsx");
const {pool} = require("../../config/db");
const { sendActivationEmail } = require("../../config/mail");

const router = express.Router();

// Setup multer storage (store in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Generate activation token and store in DB
async function createActivationToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
        `INSERT INTO activation_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)`,
        [userId, token, expiresAt]
    );

    return token;
}

router.post('/admin/login',async(req,res)=>{
    try{
        const {email,password} = req.body;
        
        const [rows] = await pool.query(
            `select *from users where email = ? AND role ="admin"`,[email]
        );
        if(rows.length === 0){
            return res.status(401).send("no user found ");
        }
        const admin = rows[0];
        const valid = await crypt.compare(password,admin.password_hash);
        if(!valid){
            return res.status(401).send('Invalid Credentials');
        }
        console.log("Admin Logged in")
        res.redirect('/admin_dashboard.html');
    }
    catch(err){
        console.log(err);
        res.send("Internal server error");
    }
});

// POST route to upload Excel file with student data
router.post('/admin/upload-students', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Read Excel buffer
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // first sheet
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Return JSON array
        res.json({ students: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read Excel file' });
    }
});

// POST route to add users from uploaded data and send activation emails
router.post('/admin/add-users', async (req, res) => {
    try {
        const { students } = req.body;

        if (!students || students.length === 0) {
            return res.status(400).json({ error: 'No student data provided' });
        }

        // Helper to get value case-insensitively
        const getValue = (obj, key) => {
            const lowerKey = key.toLowerCase().trim();
            for (const k of Object.keys(obj)) {
                if (k.toLowerCase().trim() === lowerKey) {
                    return obj[k];
                }
            }
            return null;
        };

        const results = {
            success: [],
            failed: []
        };

        for (const student of students) {
            try {
                // Log the student object for debugging
                console.log('Processing student:', JSON.stringify(student));
                
                // Get values with flexible column matching
                const name = getValue(student, 'name');
                const email = getValue(student, 'email');
                const branch = getValue(student, 'branch');
                const admissionNumber = getValue(student, 'admission_number') || getValue(student, 'admissionnumber') || getValue(student, 'admission number');

                if (!name || !email) {
                    throw new Error(`Missing required fields: name=${name}, email=${email}`);
                }

                // Insert student into users table with a placeholder password
                const placeholderPassword = await crypt.hash(crypto.randomBytes(16).toString('hex'), 10);
                
                const [result] = await pool.query(
                    `INSERT INTO users (name, email, password_hash, role, branch, admission_number, is_active)
                     VALUES (?, ?, ?, 'student', ?, ?, FALSE)
                     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
                    [name, email, placeholderPassword, branch, admissionNumber]
                );

                const userId = result.insertId;

                // Create activation token
                const token = await createActivationToken(userId);

                // Send activation email
                await sendActivationEmail(email, name, token);

                results.success.push({ email, name });
            } catch (err) {
                const studentEmail = getValue(student, 'email') || 'unknown';
                console.error(`Failed to add student ${studentEmail}:`, err.message);
                results.failed.push({ email: studentEmail, error: err.message });
            }
        }

        res.json({
            message: `Added ${results.success.length} users, ${results.failed.length} failed`,
            results
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add users' });
    }
});

// POST route to set password using activation token
router.post('/set-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Find the token
        const [rows] = await pool.query(
            `SELECT * FROM activation_tokens WHERE token = ?`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        const tokenData = rows[0];

        if (tokenData.used) {
            return res.status(400).json({ error: 'Token already used' });
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            return res.status(400).json({ error: 'Token has expired' });
        }

        // Hash the new password
        const hashedPassword = await crypt.hash(password, 10);

        // Update user's password and activate account
        await pool.query(
            `UPDATE users SET password_hash = ?, is_active = TRUE WHERE id = ?`,
            [hashedPassword, tokenData.user_id]
        );

        // Mark token as used
        await pool.query(
            `UPDATE activation_tokens SET used = TRUE WHERE id = ?`,
            [tokenData.id]
        );

        res.json({ message: 'Password set successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to set password' });
    }
});

// GET route to verify token validity
router.get('/verify-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ valid: false, error: 'Token is required' });
        }

        const [rows] = await pool.query(
            `SELECT t.*, u.name, u.email FROM activation_tokens t
             JOIN users u ON t.user_id = u.id
             WHERE t.token = ?`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ valid: false, error: 'Invalid token' });
        }

        const tokenData = rows[0];

        if (tokenData.used) {
            return res.status(400).json({ valid: false, error: 'Token already used' });
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            return res.status(400).json({ valid: false, error: 'Token has expired' });
        }

        res.json({ valid: true, name: tokenData.name, email: tokenData.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ valid: false, error: 'Failed to verify token' });
    }
});

// Get admin dashboard stats
router.get('/admin/stats', async (req, res) => {
    try {
        // Total students
        const [studentsResult] = await pool.query(
            `SELECT COUNT(*) as count FROM users WHERE role = 'student'`
        );
        const totalStudents = studentsResult[0].count;

        // Pending approvals (individual department approvals that are pending)
        const [pendingResult] = await pool.query(
            `SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'`
        );
        const pendingApprovals = pendingResult[0].count;

        // Completed applications (all approvals are approved for the application)
        const [completedResult] = await pool.query(
            `SELECT COUNT(*) as count FROM applications WHERE status = 'completed'`
        );
        const completedApplications = completedResult[0].count;

        // Total applications (for additional context)
        const [totalAppsResult] = await pool.query(
            `SELECT COUNT(*) as count FROM applications`
        );
        const totalApplications = totalAppsResult[0].count;

        // Rejected applications
        const [rejectedResult] = await pool.query(
            `SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'`
        );
        const rejectedApplications = rejectedResult[0].count;

        // Total departments
        const [deptResult] = await pool.query(
            `SELECT COUNT(*) as count FROM departments`
        );
        const totalDepartments = deptResult[0].count;

        res.json({
            totalStudents,
            pendingApprovals,
            completedApplications,
            totalApplications,
            rejectedApplications,
            totalDepartments
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get all departments
router.get('/admin/departments', async (req, res) => {
    try {
        const [departments] = await pool.query(
            `SELECT d.*, u.name as officer_name, u.email as officer_email 
             FROM departments d
             LEFT JOIN users u ON d.officer_id = u.id
             ORDER BY d.name`
        );
        res.json({ departments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get departments' });
    }
});

// Create officer and assign to department
router.post('/admin/create-officer', async (req, res) => {
    try {
        const { name, email, password, departmentId, departmentName } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Hash password
        const hashedPassword = await crypt.hash(password, 10);

        // Create officer user
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, 'officer', TRUE)`,
            [name, email, hashedPassword]
        );

        const officerId = result.insertId;

        // If departmentId provided, assign officer to that department
        if (departmentId) {
            await pool.query(
                `UPDATE departments SET officer_id = ? WHERE id = ?`,
                [officerId, departmentId]
            );
        } else if (departmentName) {
            // Create new department with officer
            await pool.query(
                `INSERT INTO departments (name, type, officer_id) VALUES (?, 'COMMON', ?)`,
                [departmentName, officerId]
            );
        }

        res.json({ success: true, message: 'Officer created successfully', officerId });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create officer' });
    }
});

// // Initialize default departments
// router.post('/admin/init-departments', async (req, res) => {
//     try {
//         const defaultDepartments = [
//             'College Office',
//             'Library',
//             'SC/ST/BC Book Bank',
//             'Hostel Office',
//             'Hostel Furniture',
//             'Cooperative Stores',
//             'Physical Education Department',
//             'Student Union',
//             'Workshop',
//             'Physics Laboratory',
//             'Chemistry Laboratory',
//             'Branch-Specific Laboratories',
//             'Head of Department',
//             'Accounts Section'
//         ];

//         for (const deptName of defaultDepartments) {
//             await pool.query(
//                 `INSERT IGNORE INTO departments (name, type) VALUES (?, 'COMMON')`,
//                 [deptName]
//             );
//         }

//         res.json({ success: true, message: 'Departments initialized' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Failed to initialize departments' });
//     }
// });

module.exports = router; 