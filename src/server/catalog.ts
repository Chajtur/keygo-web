import type { PoolConnection } from "mysql2/promise";

export async function ensureOperationalCatalog(connection: PoolConnection) {
  await connection.execute(`
    INSERT INTO users (public_id, email_normalized, password_hash, full_name, status, created_at, updated_at)
    VALUES (UUID(), 'system@keygo.local', 'NO_INTERACTIVE_LOGIN', 'Sistema KeyGo', 'SYSTEM', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`);
  await connection.execute(`
    INSERT INTO warehouses (public_id, code, name, country_code, timezone, address_line1, city, active)
    VALUES (UUID(), 'MIA', 'Bodega Miami', 'US', 'America/New_York', '7420 NW 52nd Street', 'Miami', TRUE)
    ON DUPLICATE KEY UPDATE name = VALUES(name), active = TRUE`);
  await connection.execute(`
    INSERT INTO warehouse_locations (warehouse_id, code, type, active)
    SELECT id, 'MIA-RECEPCION', 'RECEIVING', TRUE FROM warehouses WHERE code = 'MIA'
    ON DUPLICATE KEY UPDATE active = TRUE`);
  for (const [code, name] of [["UPS", "UPS"], ["USPS", "USPS"], ["FEDEX", "FedEx"], ["AMZL", "Amazon Logistics"], ["OTHER", "Otro"]]) {
    await connection.execute(
      "INSERT INTO carriers (code, name, normalization_rules, active) VALUES (?, ?, JSON_OBJECT(), TRUE) ON DUPLICATE KEY UPDATE name=VALUES(name), active=TRUE",
      [code, name],
    );
  }
}
