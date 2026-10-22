USE `wms-system-toho`;

CREATE TABLE IF NOT EXISTS parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_number VARCHAR(80) NOT NULL,
    part_name VARCHAR(200) NOT NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parts_part_number (part_number),
    KEY ix_parts_timestamp (`timestamp`)
);

INSERT INTO parts (part_number, part_name, `timestamp`)
VALUES ('PART-001', 'Sample Warehouse Part', NOW())
ON DUPLICATE KEY UPDATE part_name = VALUES(part_name);
