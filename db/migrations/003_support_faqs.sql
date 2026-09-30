-- FAQ content and support permissions. Safe to re-run.
CREATE TABLE IF NOT EXISTS faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX(is_published, category, sort_order, id),
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO roles (code, description, active) VALUES
  ('ATENCION_CLIENTE', 'Administra FAQs y atiende los tickets y consultas de clientes.', TRUE)
ON DUPLICATE KEY UPDATE description=VALUES(description), active=TRUE;

INSERT INTO permissions (code, description) VALUES
  ('faqs.manage', 'Crear, editar, publicar y archivar preguntas frecuentes.'),
  ('tickets.manage', 'Consultar, asignar, responder y actualizar tickets de soporte.')
ON DUPLICATE KEY UPDATE description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('faqs.manage','tickets.manage')
WHERE r.code IN ('ADMINISTRADOR_EMPRESA','ATENCION_CLIENTE');
