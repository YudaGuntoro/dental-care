-- Fresh database bootstrap for DentalCare
-- PT YKK AP Indonesia / MySQL 8

CREATE DATABASE IF NOT EXISTS `wms-system-toho`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `wms-system-toho`;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(50) NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
);

-- Default login: admin / admin123
INSERT IGNORE INTO users
    (id, username, full_name, email, role, status, password_hash, password_salt)
VALUES
    (1, 'admin', 'Dental Care Administrator', 'admin@dental-care.local', 'ADMIN', 'ACTIVE',
     'mV/QhZOhh7mvmWj0P1RgeXm3hZB1AkKHY5jfEcrC7PE=', 'Y21tcy1hZG1pbi1zYWx0LXYx');

SOURCE database/locations.sql;
SOURCE database/parts.sql;
SOURCE database/stock_movements.sql;
SOURCE Backend/DentalCare.Persistence/Migrations/20260708_001_shift_master_and_no_target.sql;
SOURCE database/normalize_shift_relations.sql;
SOURCE database/drop_unused_production_tables.sql;
