USE `wms-system-toho`;

-- Location belongs to stock movements, not master parts.
-- Apply after legacy normalize_location_relations.sql, if using that migration.
-- Existing stock movement locations and quantities are preserved.
SET @part_location_fks := (
    SELECT GROUP_CONCAT(DISTINCT CONCAT('DROP FOREIGN KEY `', REPLACE(CONSTRAINT_NAME, '`', '``'), '`') SEPARATOR ', ')
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts'
      AND COLUMN_NAME = 'location_id' AND REFERENCED_TABLE_NAME IS NOT NULL
);
SET @has_part_location := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND COLUMN_NAME = 'location_id'
);
SET @remove_part_location := IF(@has_part_location > 0,
    CONCAT('ALTER TABLE parts ', IF(@part_location_fks IS NULL, '', CONCAT(@part_location_fks, ', ')), 'DROP COLUMN location_id'),
    'SELECT 1');
PREPARE remove_part_location_statement FROM @remove_part_location;
EXECUTE remove_part_location_statement;
DEALLOCATE PREPARE remove_part_location_statement;
