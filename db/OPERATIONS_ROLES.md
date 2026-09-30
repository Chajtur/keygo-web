# Roles operativos de KeyGo

Aplicar `migrations/002_staff_roles_and_permissions.sql` después del esquema inicial. La migración es idempotente: se puede volver a ejecutar para sincronizar descripciones y permisos sin duplicar asignaciones.

| Rol | Funciones permitidas |
|---|---|
| `ADMINISTRADOR_EMPRESA` | Administrar personal y roles; acceso a todos los permisos operativos y reportes. Asignar también las bodegas correspondientes en `user_warehouse_access`. |
| `BODEGA_MIAMI` | Recibir paquetes preregistrados, capturar medidas, ubicar paquetes, revisar paquetes no identificados, preparar consolidaciones y apoyar el despacho desde Miami. |
| `OPERACIONES_LOGISTICAS` | Coordinar consolidaciones y despachos, actualizar el seguimiento del tránsito y registrar la recepción de carga en Honduras. |
| `BODEGA_HONDURAS` | Registrar ubicación y recepción física en Honduras y preparar paquetes para retiro o entrega. |
| `FINANZAS` | Finalizar facturas con cargos reales al arribo; revisar comprobantes, confirmar pagos y consultar reportes financieros. |
| `ENTREGAS_HONDURAS` | Preparar entregas, confirmar entrega de paquetes liberados y registrar identidad del receptor y evidencia. |

Los empleados pueden tener más de un rol. La restricción por bodega es adicional al permiso: asignar `BODEGA_MIAMI` sin acceso a `MIA` no autoriza registrar recepciones allí. Para las tareas financieras y de entrega se mantiene la regla de negocio: no se valida ni registra pago antes de emitir el monto final en Honduras; un paquete solo se entrega después de confirmar que su propio saldo está cubierto.

Estado de implementación: la migración carga los roles y permisos y prepara la bodega lógica `TGU` con una ubicación de recepción. Su dirección física queda como “Pendiente de configurar” hasta que KeyGo proporcione la dirección real. El sistema incluye acceso separado para empleados en `/empleados/ingresar`, protección de las páginas `/operacion`, CRUD de personal con desactivación lógica, asignación múltiple de roles/bodegas y cierre de sesiones; APIs MySQL para actualizar estados de envíos, emitir cargos finales por paquete, revisar comprobantes y registrar entregas. La migración aún debe aplicarse en cada entorno y el flujo debe probarse con cuentas autorizadas.

## Endpoints operativos

Todas las rutas requieren una sesión activa, cuenta verificada, permiso RBAC y acceso a la bodega indicada. El identificador público es UUID; nunca se acepta el ID incremental interno.

| Método y ruta | Permiso / bodega | Acción |
|---|---|---|
| `GET /api/operation/staff` | `staff.manage` | Lista personal, catálogo de roles y bodegas activas. |
| `POST /api/operation/staff` | `staff.manage` | Crea usuario con contraseña inicial, roles y bodegas. |
| `PATCH /api/operation/staff/:publicId` | `staff.manage` | Edita nombre, estado, contraseña, roles y bodegas. |
| `DELETE /api/operation/staff/:publicId` | `staff.manage` | Desactiva al empleado y revoca sus sesiones; no elimina historial. |
| `PATCH /api/operation/shipments/:publicId/status` | permiso según transición / MIA o TGU | Valida transición, guarda evento y actualiza paquetes. Al recibir en TGU mueve ubicación física. |
| `POST /api/operation/invoices` | `invoices.finalize` / TGU | Emite el cargo definitivo, con monto individual por cada paquete, solo después de recibir el envío en Honduras. |
| `GET /api/operation/payments` | `payments.review` / TGU | Lista comprobantes pendientes y los paquetes de la orden. |
| `PATCH /api/operation/payments/:publicId/review` | `payments.review` / TGU | `{ "action": "APPROVE" }` asigna el pago por paquete y libera cada saldo cubierto; `{ "action": "REJECT", "reason": "..." }` rechaza con motivo. |
| `POST /api/operation/deliveries` | `deliveries.confirm` / TGU; evidencia también requiere `deliveries.record_evidence` | Registra entrega parcial o múltiple para un cliente, verifica que los paquetes estén listos y sin saldo ni incidentes, y guarda receptor/evidencia. |

El endpoint de factura recibe `shipmentPublicId`, `currency` y `packages: [{ packageCode, amount }]`. Exige exactamente los paquetes elegibles del envío y un monto final positivo por paquete. La asignación de costos comunes entre paquetes todavía requiere que Finanzas ingrese el monto final individual; no se inventa una regla de prorrateo. La API de revisión consume órdenes y reportes ya persistidos en MySQL. La integración completa con el envío del comprobante desde el portal cliente queda fuera de estos endpoints operativos.

## Asignación inicial

Crear cada cuenta de empleado mediante el flujo de registro y confirmar su correo. Después, un operador autorizado de la base de datos puede asignar el rol y la bodega. Sustituir el correo por la cuenta real:

```sql
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'BODEGA_MIAMI'
WHERE u.email_normalized = 'empleado@hondu.tech'
  AND u.status = 'ACTIVE'
  AND u.email_verified_at IS NOT NULL;

INSERT IGNORE INTO user_warehouse_access (user_id, warehouse_id)
SELECT u.id, w.id
FROM users u
JOIN warehouses w ON w.code = 'MIA' AND w.active = TRUE
WHERE u.email_normalized = 'empleado@hondu.tech'
  AND u.status = 'ACTIVE'
  AND u.email_verified_at IS NOT NULL;
```

Para crear el primer `ADMINISTRADOR_EMPRESA`, aplica primero la migración 002, configura temporalmente `ADMIN_BOOTSTRAP_TOKEN` con un valor aleatorio de al menos 32 caracteres y completa el formulario de `/empleados/configurar-admin`. El flujo solo puede ejecutarse una vez; elimina la variable de Railway y redepliega al terminar. La cuenta se crea activa y con correo verificado, se le asignan todas las bodegas activas y se registra en auditoría. Después, el administrador puede gestionar el equipo desde `/operacion/personal`.
