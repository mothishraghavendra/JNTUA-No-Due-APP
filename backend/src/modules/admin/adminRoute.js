const express = require("express");
const crypt = require("bcrypt");
const {pool} = require("../../config/db");

const router = express.Router();

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

module.exports = router; 