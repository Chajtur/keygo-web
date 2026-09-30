-- KeyGo staff roles and permission catalog. Safe to re-run.

-- Operational destination warehouse. The street address remains explicitly
-- unconfigured until KeyGo supplies its real Honduras facility address.
INSERT INTO warehouses (public_id, code, name, country_code, timezone, address_line1, city, active)
VALUES (UUID(), 'TGU', 'Bodega Honduras', 'HN', 'America/Tegucigalpa', 'Pendiente de configurar', 'Tegucigalpa', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), active = TRUE;

INSERT INTO warehouse_locations (warehouse_id, code, type, active)
SELECT id, 'TGU-RECEPCION', 'RECEIVING', TRUE FROM warehouses WHERE code = 'TGU'
ON DUPLICATE KEY UPDATE active = TRUE;

INSERT INTO roles (code, description, active) VALUES
  ('ADMINISTRADOR_EMPRESA', 'Administra empleados, roles, configuración y operación completa.', TRUE),
  ('BODEGA_MIAMI', 'Recibe, mide, identifica y ubica paquetes en la bodega de Miami.', TRUE),
  ('OPERACIONES_LOGISTICAS', 'Coordina consolidaciones, despachos, tránsito y arribo a Honduras.', TRUE),
  ('BODEGA_HONDURAS', 'Recibe, clasifica y prepara paquetes en la bodega de Honduras.', TRUE),
  ('FINANZAS', 'Emite cargos finales y revisa, aprueba o rechaza comprobantes de pago.', TRUE),
  ('ENTREGAS_HONDURAS', 'Entrega paquetes liberados y registra la evidencia de entrega.', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description), active = TRUE;

INSERT INTO permissions (code, description) VALUES
  ('staff.manage', 'Crear, desactivar y asignar roles a empleados.'),
  ('packages.receive_mia', 'Registrar la recepción de paquetes en Miami.'),
  ('packages.measure', 'Registrar o corregir peso y dimensiones de paquetes.'),
  ('packages.locate', 'Asignar o cambiar ubicación física de paquetes.'),
  ('packages.review_unidentified', 'Revisar y vincular paquetes no identificados.'),
  ('consolidations.prepare', 'Preparar y cerrar consolidaciones de paquetes.'),
  ('shipments.dispatch', 'Crear lotes y confirmar el despacho desde Miami.'),
  ('shipments.update_tracking', 'Registrar cambios de estado durante el tránsito.'),
  ('shipments.receive_honduras', 'Confirmar el arribo y recepción de carga en Honduras.'),
  ('invoices.finalize', 'Calcular y emitir el monto final después del arribo a Honduras.'),
  ('payments.review', 'Revisar y resolver comprobantes de pago reportados.'),
  ('payments.confirm', 'Confirmar pagos y liberar los paquetes correspondientes.'),
  ('deliveries.prepare', 'Preparar solicitudes de retiro o entrega de paquetes.'),
  ('deliveries.confirm', 'Confirmar entrega de paquetes ya liberados.'),
  ('deliveries.record_evidence', 'Registrar identidad del receptor y evidencia de entrega.'),
  ('reports.read', 'Consultar reportes operativos y financieros.')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- The administrator receives every permission.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'ADMINISTRADOR_EMPRESA';

-- Miami staff can receive and prepare cargo, but cannot approve payments or deliver in Honduras.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'packages.receive_mia', 'packages.measure', 'packages.locate',
  'packages.review_unidentified', 'consolidations.prepare', 'shipments.dispatch'
) WHERE r.code = 'BODEGA_MIAMI';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'consolidations.prepare', 'shipments.dispatch', 'shipments.update_tracking',
  'shipments.receive_honduras', 'reports.read'
) WHERE r.code = 'OPERACIONES_LOGISTICAS';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'packages.locate', 'shipments.receive_honduras', 'deliveries.prepare'
) WHERE r.code = 'BODEGA_HONDURAS';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'invoices.finalize', 'payments.review', 'payments.confirm', 'reports.read'
) WHERE r.code = 'FINANZAS';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'deliveries.prepare', 'deliveries.confirm', 'deliveries.record_evidence'
) WHERE r.code = 'ENTREGAS_HONDURAS';
