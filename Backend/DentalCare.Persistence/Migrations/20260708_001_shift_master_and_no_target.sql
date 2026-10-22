-- DentalCare - add shift master and make target/planned quantity optional.

CREATE TABLE IF NOT EXISTS shift_masters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_code VARCHAR(50) NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shift_masters_code (shift_code),
    KEY ix_shift_masters_sort_order (sort_order)
);

INSERT INTO shift_masters (shift_code, shift_name, sort_order, is_active)
VALUES
    ('SHIFT_1', 'Shift 1', 1, 1),
    ('SHIFT_2', 'Shift 2', 2, 1),
    ('SHIFT_3', 'Shift 3', 3, 1),
    ('LONG_SHIFT_1', 'Long Shift 1', 4, 1),
    ('LONG_SHIFT_2', 'Long Shift 2', 5, 1)
ON DUPLICATE KEY UPDATE
    shift_name = VALUES(shift_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active);

SOURCE database/normalize_shift_relations.sql;
