USE dental_care;

-- Tambahkan transaksi untuk kunjungan demo yang selesai agar laporan harian
-- menampilkan pendapatan pada tanggal-tanggal demo. Aman dijalankan berulang kali.
INSERT INTO dental_payments (patient_id, appointment_id, amount, method, status, paid_at)
SELECT
    a.patient_id,
    a.id,
    COALESCE(t.price, 150000),
    CASE MOD(a.id, 3)
        WHEN 0 THEN 'Cash'
        WHEN 1 THEN 'Transfer'
        ELSE 'QRIS'
    END,
    'Paid',
    DATE_ADD(a.scheduled_at, INTERVAL 15 MINUTE)
FROM appointments a
LEFT JOIN dental_treatments t ON t.id = a.treatment_id
WHERE a.status = 'Completed'
  AND a.notes LIKE 'DEMO % SLOT % - Data dummy untuk demo antrean'
  AND NOT EXISTS (
      SELECT 1 FROM dental_payments existing
      WHERE existing.appointment_id = a.id
  );
