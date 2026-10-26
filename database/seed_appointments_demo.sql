USE dental_care;

INSERT INTO patients (full_name, phone, address, medical_notes)
SELECT demo.full_name, demo.phone, 'Alamat dummy untuk demo', 'DATA DEMO - Bukan pasien asli'
FROM (
    SELECT 'DEMO - Pasien 01' AS full_name, '0000000001' AS phone UNION ALL
    SELECT 'DEMO - Pasien 02', '0000000002' UNION ALL
    SELECT 'DEMO - Pasien 03', '0000000003' UNION ALL
    SELECT 'DEMO - Pasien 04', '0000000004' UNION ALL
    SELECT 'DEMO - Pasien 05', '0000000005'
) AS demo
WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.full_name = demo.full_name);

DROP TEMPORARY TABLE IF EXISTS tmp_demo_appointment_days;
CREATE TEMPORARY TABLE tmp_demo_appointment_days (day_offset INT NOT NULL PRIMARY KEY);
INSERT INTO tmp_demo_appointment_days (day_offset)
VALUES (-7), (-6), (-5), (-4), (-3), (-2), (-1), (0), (1), (2), (3);

DROP TEMPORARY TABLE IF EXISTS tmp_demo_appointment_slots;
CREATE TEMPORARY TABLE tmp_demo_appointment_slots (
    slot_number INT NOT NULL PRIMARY KEY,
    appointment_time TIME NOT NULL
);
INSERT INTO tmp_demo_appointment_slots (slot_number, appointment_time)
VALUES (1, '09:00:00'), (2, '10:30:00'), (3, '13:00:00'), (4, '14:30:00'), (5, '16:00:00');

SET @demo_doctor_id = (SELECT MIN(id) FROM doctors WHERE is_active = TRUE);
SET @demo_treatment_id = (SELECT MIN(id) FROM dental_treatments WHERE is_active = TRUE);

START TRANSACTION;

INSERT INTO appointments (patient_id, doctor_id, treatment_id, scheduled_at, status, notes)
SELECT
    p.id,
    @demo_doctor_id,
    @demo_treatment_id,
    TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL d.day_offset DAY), s.appointment_time),
    CASE
        WHEN d.day_offset < 0 AND s.slot_number = 3 THEN 'NoShow'
        WHEN d.day_offset < 0 THEN 'Completed'
        ELSE 'Scheduled'
    END,
    CONCAT('DEMO ', DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL d.day_offset DAY), '%Y%m%d'), ' SLOT ', LPAD(s.slot_number, 2, '0'), ' - Data dummy untuk demo antrean')
FROM tmp_demo_appointment_days d
JOIN tmp_demo_appointment_slots s ON d.day_offset <> 0 OR s.slot_number <= 5
JOIN patients p ON p.full_name = CONCAT('DEMO - Pasien ', LPAD(MOD(MOD(d.day_offset + s.slot_number - 1, 5) + 5, 5) + 1, 2, '0'))
WHERE (d.day_offset = 0 OR s.slot_number <= 3)
  AND NOT EXISTS (
      SELECT 1
      FROM appointments existing
      WHERE existing.notes = CONCAT('DEMO ', DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL d.day_offset DAY), '%Y%m%d'), ' SLOT ', LPAD(s.slot_number, 2, '0'), ' - Data dummy untuk demo antrean')
  );

COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_demo_appointment_days;
DROP TEMPORARY TABLE IF EXISTS tmp_demo_appointment_slots;
