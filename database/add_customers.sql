-- Run once on the WMS database before starting the updated API.
CREATE TABLE IF NOT EXISTS customers (
    id INT NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(200) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ux_customers_customer_name (customer_name),
    KEY ix_customers_is_active (is_active)
);

ALTER TABLE stock_movements
    ADD COLUMN customer_id INT NULL,
    ADD KEY ix_stock_movements_customer_id (customer_id),
    ADD CONSTRAINT fk_stock_movements_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT IGNORE INTO customers (customer_name, is_active)
SELECT DISTINCT TRIM(customer_name), 1
FROM stock_movements
WHERE customer_name IS NOT NULL AND TRIM(customer_name) <> '';

UPDATE stock_movements movement
INNER JOIN customers customer ON customer.customer_name = TRIM(movement.customer_name)
SET movement.customer_id = customer.id
WHERE movement.customer_id IS NULL
  AND movement.customer_name IS NOT NULL
  AND TRIM(movement.customer_name) <> '';
