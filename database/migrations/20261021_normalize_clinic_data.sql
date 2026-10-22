-- Jalankan satu kali setelah 20261020_clinic_workflow.sql.
-- Catatan jadwal lama dan tindak lanjut yang tidak punya kunjungan cocok dipertahankan.

CREATE TABLE patient_allergies (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergen VARCHAR(500) NOT NULL,
    reaction VARCHAR(300) NULL,
    CONSTRAINT fk_patient_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    UNIQUE KEY uq_patient_allergies_allergen (patient_id, allergen)
) ENGINE=InnoDB;

INSERT INTO patient_allergies (patient_id, allergen)
SELECT id, TRIM(allergies)
FROM patients
WHERE allergies IS NOT NULL AND TRIM(allergies) <> '';

CREATE TABLE doctor_practice_schedules (
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

INSERT INTO doctor_practice_schedules (doctor_id, legacy_text)
SELECT id, TRIM(practice_schedule)
FROM doctors
WHERE practice_schedule IS NOT NULL AND TRIM(practice_schedule) <> '';

ALTER TABLE follow_ups
    ADD COLUMN appointment_id INT NULL AFTER id,
    MODIFY COLUMN patient_id INT NULL,
    MODIFY COLUMN last_treatment_at DATETIME NULL;

UPDATE follow_ups f
SET f.appointment_id = (
    SELECT a.id
    FROM appointments a
    WHERE a.patient_id = f.patient_id
      AND (f.treatment_id IS NULL OR a.treatment_id = f.treatment_id)
      AND a.scheduled_at <= f.last_treatment_at
    ORDER BY a.scheduled_at DESC, a.id DESC
    LIMIT 1
)
WHERE f.patient_id IS NOT NULL AND f.last_treatment_at IS NOT NULL;

UPDATE follow_ups
SET patient_id = NULL, treatment_id = NULL, last_treatment_at = NULL
WHERE appointment_id IS NOT NULL;

ALTER TABLE follow_ups
    ADD CONSTRAINT fk_follow_ups_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    ADD INDEX ix_follow_ups_appointment (appointment_id);

ALTER TABLE patients DROP COLUMN allergies;
ALTER TABLE doctors DROP COLUMN practice_schedule;
