# KeyGo Cargo Express

Aplicación Next.js 16 + TypeScript para el ecosistema logístico de KeyGo. La persistencia operativa usa MySQL.

## Flujo vertical disponible

1. El cliente se registra en `/registrarse`.
2. MySQL crea usuario, cliente, aceptación de política, token de verificación y casillero `KG-######` en una sola transacción.
3. El cliente confirma su correo e inicia sesión en `/ingresar`.
4. En `/app/casillero` consulta su código y dirección de Miami, cargados desde MySQL.
5. Desde `/app/preregistros/nuevo` registra el tracking de una compra.
6. Bodega abre `/operacion/recepcion`, escanea el tracking, registra medidas y confirma recepción.
7. El sistema crea el paquete, guarda su primer evento como `RECEIVED_USA` y notifica al cliente.

El script `npm run test:flow` ejecuta ese recorrido completo con datos de prueba únicos y confirma que el paquete aparece en la cuenta autenticada.

## Variables locales

Copiar `.env.example` a `.env.local` y completar MySQL y correo. Los archivos `.env*` están ignorados por Git.

Para Gmail:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=correo@gmail.com
SMTP_PASSWORD=contraseña_de_aplicación
SMTP_FROM="KeyGo Cargo Express <correo@gmail.com>"
APP_BASE_URL=http://localhost:3000
```

La cuenta de Google debe tener verificación en dos pasos y debe usarse una contraseña de aplicación. No se debe usar ni compartir la contraseña normal de Gmail.

En Railway Hobby no funciona SMTP saliente. Para producción con Resend configura `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM` (por ejemplo `KeyGo Cargo Express <notificaciones@hondu.tech>`) y `APP_BASE_URL=https://keygo-web-production.up.railway.app`. `APP_BASE_URL` debe ser HTTPS y nunca `localhost`; la aplicación ahora rechaza una URL local en producción para evitar enviar enlaces de verificación inválidos. Tras cambiar las variables, redepliega el servicio y prueba el registro o el reenvío de verificación.

## Roles del personal

El esquema inicial crea las tablas RBAC (`roles`, `permissions`, `user_roles`, `role_permissions` y `user_warehouse_access`). Después de aplicar `db/migrations/001_initial_schema.sql`, ejecutar una vez `db/migrations/002_staff_roles_and_permissions.sql` para cargar los roles y permisos. La recepción de paquetes en producción exige una sesión de empleado, el permiso `packages.receive_mia` y acceso asignado a la bodega `MIA`; el registro de recepción guarda al empleado como responsable. En desarrollo esa ruta sigue disponible para el flujo local.

La migración define administrador, bodega Miami, operaciones logísticas, bodega Honduras, finanzas y entregas Honduras; también prepara las ubicaciones `MIA` y `TGU` con direcciones de recepción. La dirección física de TGU queda pendiente de configuración. Crea al primer `ADMINISTRADOR_EMPRESA` desde `/empleados/configurar-admin` siguiendo las instrucciones de inicialización de abajo; luego podrá gestionar empleados desde `/operacion/personal`.

El acceso separado para empleados está en `/empleados/ingresar`; requiere cuenta activa, correo confirmado y rol vigente. Para crear al primer administrador, aplica la migración de roles, configura temporalmente `ADMIN_BOOTSTRAP_TOKEN` con un valor aleatorio de al menos 32 caracteres, abre `/empleados/configurar-admin` y completa el formulario; al terminar, elimina esa variable y redepliega. El endpoint es de un solo uso: se cierra tras asignar `ADMINISTRADOR_EMPRESA`. El grupo `/operacion` redirige al acceso cuando no hay una sesión de empleado. El CRUD está disponible en `/api/operation/staff` (GET/POST) y `/api/operation/staff/:publicId` (PATCH/DELETE). Incluye asignación de múltiples roles y bodegas, contraseña inicial, edición, desactivación lógica y revocación de sesiones. Las APIs operativas también incluyen cambios auditados de estado de envíos, emisión de cargos finales al arribo, revisión de comprobantes y registro de entregas; contratos y restricciones están en `db/OPERATIONS_ROLES.md`. La emisión final exige un monto individual confirmado por paquete y las órdenes/comprobantes de pago deben existir en MySQL para su revisión.

Verificar únicamente la autenticación SMTP:

```powershell
npm.cmd run email:verify
```

## Desarrollo y validación

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run test:flow
```

La ruta `/api/packages/receive-by-tracking` conserva acceso de prueba en desarrollo. En producción exige sesión de empleado con `packages.receive_mia` y acceso asignado a la bodega `MIA`; los endpoints nuevos `/api/operation/*` exigen sesión, permiso RBAC y bodega en todos los entornos.
