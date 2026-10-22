USE `wms-system-toho`;

CREATE TABLE IF NOT EXISTS locations (
    id INT NOT NULL AUTO_INCREMENT,
    location_code VARCHAR(80) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_locations_location_code (location_code),
    KEY ix_locations_is_active (is_active),
    KEY ix_locations_created_at (created_at)
);

INSERT INTO locations (location_code, location_name, description, is_active)
SELECT 'MAIN', 'Main Warehouse', 'Default warehouse location', 1
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE location_code = 'MAIN');
