USE dental_care;

START TRANSACTION;

INSERT INTO doctors (full_name, specialty, phone, email, license_number, is_active) VALUES
  ('drg. Aditya Pranoto', 'Konservasi Gigi', '081234561001', 'aditya.pranoto@dentalcare.local', 'SIP-DC-001', 1),
  ('drg. Nadia Permata', 'Orthodonti', '081234561002', 'nadia.permata@dentalcare.local', 'SIP-DC-002', 1),
  ('drg. Raka Wijaya', 'Bedah Mulut', '081234561003', 'raka.wijaya@dentalcare.local', 'SIP-DC-003', 1)
ON DUPLICATE KEY UPDATE specialty = VALUES(specialty), is_active = 1;

INSERT INTO dental_treatments (name, description, price, duration_minutes, is_active) VALUES
  ('Pemeriksaan Gigi', 'Pemeriksaan dan konsultasi kondisi gigi', 150000, 30, 1),
  ('Scaling Gigi', 'Pembersihan karang gigi dan plak', 350000, 45, 1),
  ('Tambal Gigi', 'Restorasi gigi berlubang', 500000, 60, 1),
  ('Cabut Gigi', 'Pencabutan gigi dengan anestesi lokal', 450000, 45, 1),
  ('Pemutihan Gigi', 'Perawatan whitening untuk senyum lebih cerah', 1200000, 90, 1)
ON DUPLICATE KEY UPDATE description = VALUES(description), price = VALUES(price), duration_minutes = VALUES(duration_minutes), is_active = 1;

INSERT INTO patients (full_name, phone, email, birth_date, gender, medical_notes) VALUES
  ('Andi Pratama', '081234560001', 'andi.pratama@example.com', '1992-03-14', 'Male', 'Sensitif terhadap makanan dingin'),
  ('Siti Rahmawati', '081234560002', 'siti.rahmawati@example.com', '1988-07-22', 'Female', 'Kontrol rutin setiap 6 bulan'),
  ('Budi Santoso', '081234560003', 'budi.santoso@example.com', '1995-11-05', 'Male', 'Riwayat gigi berlubang'),
  ('Maya Lestari', '081234560004', 'maya.lestari@example.com', '1990-01-30', 'Female', 'Tidak ada catatan khusus'),
  ('Rina Kurnia', '081234560005', 'rina.kurnia@example.com', '2001-09-18', 'Female', 'Menggunakan behel'),
  ('Fajar Nugroho', '081234560006', 'fajar.nugroho@example.com', '1985-12-09', 'Male', 'Tekanan darah normal');

SET @p1 = (SELECT id FROM patients WHERE email = 'andi.pratama@example.com' ORDER BY id DESC LIMIT 1);
SET @p2 = (SELECT id FROM patients WHERE email = 'siti.rahmawati@example.com' ORDER BY id DESC LIMIT 1);
SET @p3 = (SELECT id FROM patients WHERE email = 'budi.santoso@example.com' ORDER BY id DESC LIMIT 1);
SET @p4 = (SELECT id FROM patients WHERE email = 'maya.lestari@example.com' ORDER BY id DESC LIMIT 1);
SET @p5 = (SELECT id FROM patients WHERE email = 'rina.kurnia@example.com' ORDER BY id DESC LIMIT 1);
SET @p6 = (SELECT id FROM patients WHERE email = 'fajar.nugroho@example.com' ORDER BY id DESC LIMIT 1);
SET @t_check = (SELECT id FROM dental_treatments WHERE name = 'Pemeriksaan Gigi');
SET @t_scale = (SELECT id FROM dental_treatments WHERE name = 'Scaling Gigi');
SET @t_fill = (SELECT id FROM dental_treatments WHERE name = 'Tambal Gigi');
SET @t_extract = (SELECT id FROM dental_treatments WHERE name = 'Cabut Gigi');
SET @t_whiten = (SELECT id FROM dental_treatments WHERE name = 'Pemutihan Gigi');

INSERT INTO appointments (patient_id, treatment_id, scheduled_at, status, notes) VALUES
  (@p1, @t_check, '2026-10-12 09:00:00', 'Completed', 'Kontrol awal'),
  (@p2, @t_scale, '2026-10-13 10:00:00', 'Completed', 'Scaling rutin'),
  (@p3, @t_fill, '2026-10-14 13:00:00', 'Completed', 'Tambal gigi geraham'),
  (@p4, @t_whiten, '2026-10-15 15:00:00', 'Completed', 'Konsultasi whitening'),
  (@p5, @t_check, '2026-10-16 11:00:00', 'Cancelled', 'Pasien berhalangan'),
  (@p6, @t_extract, '2026-10-17 14:00:00', 'Completed', 'Pencabutan gigi'),
  (@p1, @t_scale, '2026-10-18 08:30:00', 'Completed', 'Scaling lanjutan'),
  (@p2, @t_check, '2026-10-18 10:00:00', 'Scheduled', 'Kontrol berkala'),
  (@p3, @t_fill, '2026-10-18 13:30:00', 'Scheduled', 'Perawatan lanjutan'),
  (@p4, @t_whiten, '2026-10-19 09:00:00', 'Scheduled', 'Sesi whitening'),
  (@p5, @t_check, '2026-10-20 11:00:00', 'Scheduled', 'Pemeriksaan behel'),
  (@p6, @t_scale, '2026-10-21 15:00:00', 'Scheduled', 'Scaling rutin');

INSERT INTO dental_payments (patient_id, appointment_id, amount, method, status, paid_at)
SELECT a.patient_id, a.id, t.price, 'Cash', 'Paid', a.scheduled_at
FROM appointments a JOIN dental_treatments t ON t.id = a.treatment_id
WHERE a.status = 'Completed' AND a.scheduled_at >= '2026-10-12' AND a.scheduled_at < '2026-10-19';

COMMIT;
