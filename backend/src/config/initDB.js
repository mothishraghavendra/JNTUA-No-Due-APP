const { pool } = require('./db');
// this will execute the db.js file and return the export modules like pool and ConnectDB 
async function initDB(){
    try{
        await pool.query(
            `CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL,
                branch VARCHAR(100) NULL,
                admission_number VARCHAR(100) UNIQUE NULL,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;`
        );
        await pool.query(
            `CREATE TABLE departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                type ENUM('COMMON', 'BRANCH') NOT NULL,
                branch VARCHAR(100) NULL,
                officer_id INT NULL,
                
                CONSTRAINT fk_department_officer
                    FOREIGN KEY (officer_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB;`
        );
        await pool.query(
            `CREATE TABLE applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,

                CONSTRAINT fk_application_student
                    FOREIGN KEY (student_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB;`
        );
        await pool.query(
            `CREATE TABLE approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                department_id INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                remarks TEXT NULL,
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,

                CONSTRAINT fk_approval_application
                    FOREIGN KEY (application_id)
                    REFERENCES applications(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_approval_department
                    FOREIGN KEY (department_id)
                    REFERENCES departments(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_approval_user
                    FOREIGN KEY (approved_by)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB;`
        );
        await pool.query(
            `CREATE TABLE activation_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,

                CONSTRAINT fk_token_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB;`
        );
        await pool.query(
            `CREATE TABLE audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                action VARCHAR(255) NOT NULL,
                entity_type VARCHAR(100) NOT NULL,
                entity_id INT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_audit_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB;`
        );

        console.log("All tables created Successfully");
    }
    catch(err){
        console.log("error : ",err.message);
    }
}

module.exports = initDB()
