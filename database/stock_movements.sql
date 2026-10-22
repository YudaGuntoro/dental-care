USE `wms-system-toho`;

CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movement_type VARCHAR(10) NOT NULL,
    part_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    customer_name VARCHAR(200) NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_stock_movements_type (movement_type),
    KEY ix_stock_movements_part_id (part_id),
    KEY ix_stock_movements_location_id (location_id),
    KEY ix_stock_movements_timestamp (`timestamp`),
    CONSTRAINT fk_stock_movements_part FOREIGN KEY (part_id) REFERENCES parts(id),
    CONSTRAINT fk_stock_movements_location FOREIGN KEY (location_id) REFERENCES locations(id)
);

SOURCE database/normalize_location_relations.sql;
