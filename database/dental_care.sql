CREATE DATABASE IF NOT EXISTS dental_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dental_care;

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
) ENGINE=InnoDB;

-- Demo login: admin / admin123. Change this after first sign-in.
INSERT IGNORE INTO users (id, username, full_name, email, role, status, password_hash, password_salt)
VALUES (1, 'admin', 'Dental Care Administrator', 'admin@dental-care.local', 'ADMIN', 'ACTIVE',
        'mV/QhZOhh7mvmWj0P1RgeXm3hZB1AkKHY5jfEcrC7PE=', 'Y21tcy1hZG1pbi1zYWx0LXYx');

CREATE TABLE IF NOT EXISTS patients (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(300) NULL,
    emergency_contact VARCHAR(100) NULL,
    birth_date DATE NULL,
    gender VARCHAR(20) NULL,
    medical_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_patients_full_name (full_name),
    INDEX ix_patients_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patient_allergies (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergen VARCHAR(500) NOT NULL,
    reaction VARCHAR(300) NULL,
    CONSTRAINT fk_patient_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    UNIQUE KEY uq_patient_allergies_allergen (patient_id, allergen)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NULL,
    treatment_id INT NULL,
    scheduled_at DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    notes VARCHAR(500) NULL,
    diagnosis VARCHAR(1000) NULL,
    procedure_notes VARCHAR(1000) NULL,
    prescription VARCHAR(1000) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    INDEX ix_appointments_scheduled_at (scheduled_at),
    INDEX ix_appointments_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dental_treatments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE INDEX ux_dental_treatments_name (name)
) ENGINE=InnoDB;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_treatment FOREIGN KEY (treatment_id) REFERENCES dental_treatments(id);

CREATE TABLE IF NOT EXISTS dental_payments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT NULL,
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    status VARCHAR(30) NOT NULL DEFAULT 'Paid',
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dental_payments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_dental_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    INDEX ix_dental_payments_paid_at (paid_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctors (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    specialty VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    license_number VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX ix_doctors_full_name (full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctor_practice_schedules (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week TINYINT UNSIGNED NULL COMMENT 'ISO weekday: Monday=1 through Sunday=7',
    start_time TIME NULL,
    end_time TIME NULL,
    legacy_text VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_doctor_practice_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY uq_doctor_practice_schedule_slot (doctor_id, day_of_week, start_time)
) ENGINE=InnoDB;

ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS follow_ups (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NULL,
    patient_id INT NULL COMMENT 'Legacy fallback for follow-ups without a linked visit',
    treatment_id INT NULL,
    last_treatment_at DATETIME NULL COMMENT 'Legacy fallback for follow-ups without a linked visit',
    follow_up_at DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    notes VARCHAR(500) NULL,
    CONSTRAINT fk_follow_ups_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_follow_ups_treatment FOREIGN KEY (treatment_id) REFERENCES dental_treatments(id),
    CONSTRAINT fk_follow_ups_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    INDEX ix_follow_ups_date (follow_up_at),
    INDEX ix_follow_ups_status (status)
) ENGINE=InnoDB;
