USE `wms-system-toho`;

SET @has_pic_shift := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pic_cards'
      AND COLUMN_NAME = 'shift'
);

SET @has_pic_shift_id := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pic_cards'
      AND COLUMN_NAME = 'shift_id'
);

SET @add_pic_shift_id := IF(
    @has_pic_shift_id = 0,
    'ALTER TABLE pic_cards ADD COLUMN shift_id INT NULL AFTER department',
    'SELECT 1'
);

PREPARE add_pic_shift_id_statement FROM @add_pic_shift_id;
EXECUTE add_pic_shift_id_statement;
DEALLOCATE PREPARE add_pic_shift_id_statement;

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

SET @update_pic_shift_id := IF(
    @has_pic_shift > 0,
    'UPDATE pic_cards p
     JOIN shift_masters s
       ON UPPER(REPLACE(s.shift_name, '' '', ''_'')) = UPPER(REPLACE(p.shift, '' '', ''_''))
       OR UPPER(s.shift_code) = UPPER(REPLACE(p.shift, '' '', ''_''))
     SET p.shift_id = s.id
     WHERE p.shift_id IS NULL',
    'SELECT 1'
);

PREPARE update_pic_shift_id_statement FROM @update_pic_shift_id;
EXECUTE update_pic_shift_id_statement;
DEALLOCATE PREPARE update_pic_shift_id_statement;

UPDATE pic_cards p
JOIN shift_masters s ON s.shift_code = 'SHIFT_1'
SET p.shift_id = s.id
WHERE p.shift_id IS NULL;

SET @has_pic_shift_id_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pic_cards'
      AND INDEX_NAME = 'ix_pic_cards_shift_id'
);

SET @add_pic_shift_id_index := IF(
    @has_pic_shift_id_index = 0,
    'ALTER TABLE pic_cards ADD INDEX ix_pic_cards_shift_id (shift_id)',
    'SELECT 1'
);

PREPARE add_pic_shift_id_index_statement FROM @add_pic_shift_id_index;
EXECUTE add_pic_shift_id_index_statement;
DEALLOCATE PREPARE add_pic_shift_id_index_statement;

SET @has_pic_shift_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pic_cards'
      AND CONSTRAINT_NAME = 'fk_pic_cards_shift'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_pic_shift_fk := IF(
    @has_pic_shift_fk = 0,
    'ALTER TABLE pic_cards ADD CONSTRAINT fk_pic_cards_shift FOREIGN KEY (shift_id) REFERENCES shift_masters(id)',
    'SELECT 1'
);

PREPARE add_pic_shift_fk_statement FROM @add_pic_shift_fk;
EXECUTE add_pic_shift_fk_statement;
DEALLOCATE PREPARE add_pic_shift_fk_statement;

SET @drop_pic_shift := IF(
    @has_pic_shift > 0,
    'ALTER TABLE pic_cards DROP COLUMN shift',
    'SELECT 1'
);

PREPARE drop_pic_shift_statement FROM @drop_pic_shift;
EXECUTE drop_pic_shift_statement;
DEALLOCATE PREPARE drop_pic_shift_statement;

ALTER TABLE pic_cards MODIFY shift_id INT NOT NULL;
