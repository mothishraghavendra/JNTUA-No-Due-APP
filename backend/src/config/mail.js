const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

// Check if mail credentials are configured
const isMailConfigured = process.env.MAIL_USER && process.env.MAIL_PASS;

let transporter = null;

if (isMailConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.mailtrap.io",
        port: process.env.MAIL_PORT || 587,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

async function sendActivationEmail(studentEmail, studentName, token) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const passwordUrl = `${baseUrl}/setup_password.html?token=${token}`;

    // If mail is not configured, just log the URL (for local testing)
    if (!isMailConfigured) {
        console.log(`\n========================================`);
        console.log(`ACTIVATION EMAIL (Mail not configured)`);
        console.log(`To: ${studentEmail}`);
        console.log(`Name: ${studentName}`);
        console.log(`Set Password URL: ${passwordUrl}`);
        console.log(`========================================\n`);
        return;
    }

    const mailOptions = {
        from: '"No Dues System" <no-reply@nodues.com>',
        to: studentEmail,
        subject: 'Set Your Password - No Dues System',
        html: `
            <h2>Welcome to No Dues System</h2>
            <p>Hi ${studentName},</p>
            <p>Your account has been created. Click the link below to set your password.</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p><a href="${passwordUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Password</a></p>
            <p>Or copy this link: ${passwordUrl}</p>
            <br>
            <p>If you did not request this, please ignore this email.</p>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Activation email sent to ${studentEmail}`);
}

module.exports = { transporter, sendActivationEmail };