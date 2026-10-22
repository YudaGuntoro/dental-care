CREATE TABLE IF NOT EXISTS appointment_services (
    id INT NOT NULL AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    treatment_id INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appointment_service (appointment_id, treatment_id),
    KEY ix_appointment_services_treatment_id (treatment_id),
    CONSTRAINT fk_appointment_services_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_services_treatment FOREIGN KEY (treatment_id) REFERENCES dental_treatments(id) ON DELETE RESTRICT
);
