-- Legacy normalization: run remove_part_location.sql after this script.
USE `wms-system-toho`;

SET @has_parts_location := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parts'
      AND COLUMN_NAME = 'location'
);

SET @has_parts_location_id := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parts'
      AND COLUMN_NAME = 'location_id'
);

SET @add_parts_location_id := IF(
    @has_parts_location_id = 0,
    'ALTER TABLE parts ADD COLUMN location_id INT NULL AFTER part_name',
    'SELECT 1'
);

PREPARE add_parts_location_id_statement FROM @add_parts_location_id;
EXECUTE add_parts_location_id_statement;
DEALLOCATE PREPARE add_parts_location_id_statement;

SET @has_stock_location := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND COLUMN_NAME = 'location'
);

SET @has_stock_location_id := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND COLUMN_NAME = 'location_id'
);

SET @add_stock_location_id := IF(
    @has_stock_location_id = 0,
    'ALTER TABLE stock_movements ADD COLUMN location_id INT NULL AFTER part_id',
    'SELECT 1'
);

PREPARE add_stock_location_id_statement FROM @add_stock_location_id;
EXECUTE add_stock_location_id_statement;
DEALLOCATE PREPARE add_stock_location_id_statement;

SET @insert_part_locations := IF(
    @has_parts_location > 0,
    'INSERT INTO locations (location_code, location_name, is_active)
     SELECT DISTINCT p.location, p.location, 1
     FROM parts p
     WHERE p.location IS NOT NULL
       AND TRIM(p.location) <> ''''
     ON DUPLICATE KEY UPDATE location_name = VALUES(location_name), is_active = VALUES(is_active)',
    'SELECT 1'
);

PREPARE insert_part_locations_statement FROM @insert_part_locations;
EXECUTE insert_part_locations_statement;
DEALLOCATE PREPARE insert_part_locations_statement;

SET @insert_stock_locations := IF(
    @has_stock_location > 0,
    'INSERT INTO locations (location_code, location_name, is_active)
     SELECT DISTINCT sm.location, sm.location, 1
     FROM stock_movements sm
     WHERE sm.location IS NOT NULL
       AND TRIM(sm.location) <> ''''
     ON DUPLICATE KEY UPDATE location_name = VALUES(location_name), is_active = VALUES(is_active)',
    'SELECT 1'
);

PREPARE insert_stock_locations_statement FROM @insert_stock_locations;
EXECUTE insert_stock_locations_statement;
DEALLOCATE PREPARE insert_stock_locations_statement;

INSERT INTO locations (location_code, location_name, description, is_active)
SELECT 'MAIN', 'Main Warehouse', 'Default warehouse location', 1
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE location_code = 'MAIN');

SET @update_parts_location_id := IF(
    @has_parts_location > 0,
    'UPDATE parts p
     JOIN locations l ON l.location_code = p.location
     SET p.location_id = l.id
     WHERE p.location_id IS NULL',
    'SELECT 1'
);

PREPARE update_parts_location_id_statement FROM @update_parts_location_id;
EXECUTE update_parts_location_id_statement;
DEALLOCATE PREPARE update_parts_location_id_statement;

UPDATE parts p
JOIN locations l ON l.location_code = 'MAIN'
SET p.location_id = l.id
WHERE p.location_id IS NULL;

SET @update_stock_location_id := IF(
    @has_stock_location > 0,
    'UPDATE stock_movements sm
     JOIN locations l ON l.location_code = sm.location
     SET sm.location_id = l.id
     WHERE sm.location_id IS NULL',
    'SELECT 1'
);

PREPARE update_stock_location_id_statement FROM @update_stock_location_id;
EXECUTE update_stock_location_id_statement;
DEALLOCATE PREPARE update_stock_location_id_statement;

UPDATE stock_movements sm
JOIN parts p ON p.id = sm.part_id
SET sm.location_id = p.location_id
WHERE sm.location_id IS NULL;

SET @has_parts_location_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parts'
      AND INDEX_NAME = 'ix_parts_location'
);

SET @drop_parts_location_index := IF(
    @has_parts_location_index > 0,
    'ALTER TABLE parts DROP INDEX ix_parts_location',
    'SELECT 1'
);

PREPARE drop_parts_location_index_statement FROM @drop_parts_location_index;
EXECUTE drop_parts_location_index_statement;
DEALLOCATE PREPARE drop_parts_location_index_statement;

SET @has_parts_location_id_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parts'
      AND INDEX_NAME = 'ix_parts_location_id'
);

SET @add_parts_location_id_index := IF(
    @has_parts_location_id_index = 0,
    'ALTER TABLE parts ADD INDEX ix_parts_location_id (location_id)',
    'SELECT 1'
);

PREPARE add_parts_location_id_index_statement FROM @add_parts_location_id_index;
EXECUTE add_parts_location_id_index_statement;
DEALLOCATE PREPARE add_parts_location_id_index_statement;

SET @has_stock_location_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND INDEX_NAME = 'ix_stock_movements_location'
);

SET @drop_stock_location_index := IF(
    @has_stock_location_index > 0,
    'ALTER TABLE stock_movements DROP INDEX ix_stock_movements_location',
    'SELECT 1'
);

PREPARE drop_stock_location_index_statement FROM @drop_stock_location_index;
EXECUTE drop_stock_location_index_statement;
DEALLOCATE PREPARE drop_stock_location_index_statement;

SET @has_stock_location_id_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND INDEX_NAME = 'ix_stock_movements_location_id'
);

SET @add_stock_location_id_index := IF(
    @has_stock_location_id_index = 0,
    'ALTER TABLE stock_movements ADD INDEX ix_stock_movements_location_id (location_id)',
    'SELECT 1'
);

PREPARE add_stock_location_id_index_statement FROM @add_stock_location_id_index;
EXECUTE add_stock_location_id_index_statement;
DEALLOCATE PREPARE add_stock_location_id_index_statement;

SET @has_parts_location_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'parts'
      AND CONSTRAINT_NAME = 'fk_parts_location'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_parts_location_fk := IF(
    @has_parts_location_fk = 0,
    'ALTER TABLE parts ADD CONSTRAINT fk_parts_location FOREIGN KEY (location_id) REFERENCES locations(id)',
    'SELECT 1'
);

PREPARE add_parts_location_fk_statement FROM @add_parts_location_fk;
EXECUTE add_parts_location_fk_statement;
DEALLOCATE PREPARE add_parts_location_fk_statement;

SET @has_stock_location_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND CONSTRAINT_NAME = 'fk_stock_movements_location'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_stock_location_fk := IF(
    @has_stock_location_fk = 0,
    'ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_location FOREIGN KEY (location_id) REFERENCES locations(id)',
    'SELECT 1'
);

PREPARE add_stock_location_fk_statement FROM @add_stock_location_fk;
EXECUTE add_stock_location_fk_statement;
DEALLOCATE PREPARE add_stock_location_fk_statement;

SET @drop_parts_location := IF(
    @has_parts_location > 0,
    'ALTER TABLE parts DROP COLUMN location',
    'SELECT 1'
);

PREPARE drop_parts_location_statement FROM @drop_parts_location;
EXECUTE drop_parts_location_statement;
DEALLOCATE PREPARE drop_parts_location_statement;

SET @drop_stock_location := IF(
    @has_stock_location > 0,
    'ALTER TABLE stock_movements DROP COLUMN location',
    'SELECT 1'
);

PREPARE drop_stock_location_statement FROM @drop_stock_location;
EXECUTE drop_stock_location_statement;
DEALLOCATE PREPARE drop_stock_location_statement;

ALTER TABLE parts MODIFY location_id INT NULL;
ALTER TABLE stock_movements MODIFY location_id INT NOT NULL;
