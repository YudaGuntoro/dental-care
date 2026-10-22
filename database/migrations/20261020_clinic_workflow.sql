-- Jalankan satu kali pada database Dental Care yang sudah digunakan.
ALTER TABLE patients
    ADD COLUMN address VARCHAR(300) NULL AFTER email,
    ADD COLUMN emergency_contact VARCHAR(100) NULL AFTER address,
    ADD COLUMN allergies TEXT NULL AFTER gender;

ALTER TABLE doctors
    ADD COLUMN practice_schedule VARCHAR(500) NULL AFTER license_number;

ALTER TABLE appointments
    ADD COLUMN doctor_id INT NULL AFTER patient_id,
    ADD COLUMN diagnosis VARCHAR(1000) NULL AFTER notes,
    ADD COLUMN procedure_notes VARCHAR(1000) NULL AFTER diagnosis,
    ADD COLUMN prescription VARCHAR(1000) NULL AFTER procedure_notes,
    ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;
