const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function connectDB() {
    try {
        const connection = await pool.getConnection();
        console.log(`${process.env.DB_NAME} database connected successfully`);
        connection.release();
    } catch (err) {
        console.log("Error occurred =", err.message);
        process.exit(1);
    }
}

module.exports = { pool, connectDB };