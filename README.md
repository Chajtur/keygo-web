# KeyGo Cargo Express

Aplicación Next.js 16 + TypeScript para el ecosistema logístico de KeyGo. La persistencia operativa usa MySQL.

## Flujo vertical disponible

1. El cliente se registra en `/registrarse`.
2. MySQL crea usuario, cliente, aceptación de política, token de verificación y casillero `KG-######` en una sola transacción.
3. El cliente confirma su correo e inicia sesión en `/ingresar`.
4. Desde `/app/preregistros/nuevo` registra el tracking de una compra.
5. Bodega abre `/operacion/recepcion`, escanea el tracking, registra medidas y confirma recepción.
6. El sistema crea el paquete, guarda su primer evento como `RECEIVED_USA` y notifica al cliente.

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

La ruta operativa de recepción acepta llamadas sin clave únicamente en desarrollo. En producción requiere `OPERATION_API_KEY` mediante la cabecera `x-operation-key`; el siguiente paso será sustituirla por autenticación y permisos de empleados.
