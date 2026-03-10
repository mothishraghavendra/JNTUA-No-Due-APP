const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../../config/db");

const router = express.Router();

// Department officer login
router.post('/officer/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            `SELECT u.*, d.id as department_id, d.name as department_name 
             FROM users u
             JOIN departments d ON d.officer_id = u.id
             WHERE u.email = ? AND u.role = 'officer'`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'No officer found with this email' });
        }

        const officer = rows[0];

        if (!officer.is_active) {
            return res.status(401).json({ error: 'Account not activated' });
        }

        const valid = await bcrypt.compare(password, officer.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`Officer logged in: ${officer.email} - ${officer.department_name}`);

        res.json({
            success: true,
            officer: {
                id: officer.id,
                name: officer.name,
                email: officer.email,
                department_id: officer.department_id,
                department_name: officer.department_name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get pending approvals for a department
router.get('/officer/pending-approvals', async (req, res) => {
    try {
        const { departmentId } = req.query;

        if (!departmentId) {
            return res.status(400).json({ error: 'Department ID required' });
        }

        const [approvals] = await pool.query(
            `SELECT 
                ap.id as approval_id,
                ap.status,
                ap.remarks,
                ap.approved_at,
                a.id as application_id,
                a.applied_at,
                u.id as student_id,
                u.name as student_name,
                u.email as student_email,
                u.branch as student_branch,
                u.admission_number
             FROM approvals ap
             JOIN applications a ON ap.application_id = a.id
             JOIN users u ON a.student_id = u.id
             WHERE ap.department_id = ?
             ORDER BY 
                CASE WHEN ap.status = 'pending' THEN 0 ELSE 1 END,
                a.applied_at DESC`,
            [departmentId]
        );

        res.json({ approvals });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get approvals' });
    }
});

// Approve a request
router.post('/officer/approve', async (req, res) => {
    try {
        const { approvalId, officerId, remarks } = req.body;

        if (!approvalId || !officerId) {
            return res.status(400).json({ error: 'Approval ID and Officer ID required' });
        }

        // Update approval status
        await pool.query(
            `UPDATE approvals 
             SET status = 'approved', 
                 approved_by = ?, 
                 approved_at = NOW(),
                 remarks = ?
             WHERE id = ?`,
            [officerId, remarks || null, approvalId]
        );

        // Check if all approvals for this application are approved
        const [approval] = await pool.query(
            `SELECT application_id FROM approvals WHERE id = ?`,
            [approvalId]
        );

        if (approval.length > 0) {
            const applicationId = approval[0].application_id;

            const [pendingCount] = await pool.query(
                `SELECT COUNT(*) as count FROM approvals 
                 WHERE application_id = ? AND status != 'approved'`,
                [applicationId]
            );

            // If all approved, update application status to completed
            if (pendingCount[0].count === 0) {
                await pool.query(
                    `UPDATE applications SET status = 'completed', completed_at = NOW() WHERE id = ?`,
                    [applicationId]
                );
            }
        }

        res.json({ success: true, message: 'Request approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

// Reject a request
router.post('/officer/reject', async (req, res) => {
    try {
        const { approvalId, officerId, remarks } = req.body;

        if (!approvalId || !officerId) {
            return res.status(400).json({ error: 'Approval ID and Officer ID required' });
        }

        if (!remarks) {
            return res.status(400).json({ error: 'Remarks are required when rejecting' });
        }

        // Update approval status
        await pool.query(
            `UPDATE approvals 
             SET status = 'rejected', 
                 approved_by = ?, 
                 approved_at = NOW(),
                 remarks = ?
             WHERE id = ?`,
            [officerId, remarks, approvalId]
        );

        // Update application status to rejected
        const [approval] = await pool.query(
            `SELECT application_id FROM approvals WHERE id = ?`,
            [approvalId]
        );

        if (approval.length > 0) {
            await pool.query(
                `UPDATE applications SET status = 'rejected' WHERE id = ?`,
                [approval[0].application_id]
            );
        }

        res.json({ success: true, message: 'Request rejected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// Get department stats
router.get('/officer/stats', async (req, res) => {
    try {
        const { departmentId } = req.query;

        if (!departmentId) {
            return res.status(400).json({ error: 'Department ID required' });
        }

        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
             FROM approvals
             WHERE department_id = ?`,
            [departmentId]
        );

        res.json(stats[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Update rejected request to approved
router.post('/officer/update-rejected', async (req, res) => {
    try {
        const { approvalId, officerId, remarks } = req.body;

        if (!approvalId || !officerId) {
            return res.status(400).json({ error: 'Approval ID and Officer ID required' });
        }

        if (!remarks) {
            return res.status(400).json({ error: 'Remarks are required when updating' });
        }

        // Update approval status to approved
        await pool.query(
            `UPDATE approvals 
             SET status = 'approved', 
                 approved_by = ?, 
                 approved_at = NOW(),
                 remarks = ?
             WHERE id = ?`,
            [officerId, remarks, approvalId]
        );

        // Check if all approvals for this application are now approved
        const [approval] = await pool.query(
            `SELECT application_id FROM approvals WHERE id = ?`,
            [approvalId]
        );

        if (approval.length > 0) {
            const applicationId = approval[0].application_id;

            const [pendingOrRejected] = await pool.query(
                `SELECT COUNT(*) as count FROM approvals 
                 WHERE application_id = ? AND status != 'approved'`,
                [applicationId]
            );

            // If all approved, update application status to completed
            if (pendingOrRejected[0].count === 0) {
                await pool.query(
                    `UPDATE applications SET status = 'completed', completed_at = NOW() WHERE id = ?`,
                    [applicationId]
                );
            } else {
                // Otherwise set to pending (since it was rejected before)
                await pool.query(
                    `UPDATE applications SET status = 'pending' WHERE id = ? AND status = 'rejected'`,
                    [applicationId]
                );
            }
        }

        res.json({ success: true, message: 'Request updated to approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

module.exports = router;
