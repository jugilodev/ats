# ATS

## Autorización de tratamiento de datos

La acción **Enviar autorización** en la tabla de aspirantes envía un correo con un enlace personal, válido durante 24 horas. El enlace abre el documento completo. Para firmar, el aspirante debe aceptar la casilla, escribir la cédula registrada y firmar en el recuadro desde el celular o computador. Si se reenvía una autorización pendiente, el enlace anterior se invalida. Después de firmar, no se habilita un nuevo envío.

### Base de datos

Ejecuta una vez `backend/database/migrations/001_applicant_data_consent.sql` en la base de datos del ATS. La tabla nueva conserva el estado, los datos de identidad usados al enviar, el texto y su versión, la cédula confirmada, la firma y las fechas. No elimina el registro firmado al eliminar un aspirante; por eso PostgreSQL impedirá borrar aspirantes con una autorización registrada.

### Correo SMTP con Resend

Configura estas variables en `backend/.env` (hay un ejemplo en `backend/.env.example`):

- `PUBLIC_APP_URL`: URL pública del frontend; localmente `http://localhost:5173`. En producción debe ser HTTPS.
- `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_SECURE=false` y `SMTP_USER=resend`: configuración SMTP de Resend con STARTTLS.
- `SMTP_PASSWORD`: una API key de Resend. Guárdala solo en `backend/.env`, nunca en el repositorio, el chat o `.env.example`.
- `SMTP_FROM`: remitente de un dominio verificado en Resend, por ejemplo `ATS <seleccion@tu-dominio-verificado.com>`.
- `DATA_TREATMENT_VERSION` (opcional): versión del texto legal.
- `DATA_TREATMENT_TEXT` (opcional): texto completo que reemplaza al borrador genérico. Puede incluir `{{nombre}}`, `{{apellido}}`, `{{nombre_completo}}` y `{{cedula}}`.

Resend permite enviar por SMTP con Nodemailer usando esos valores. La cuenta debe tener verificado el dominio usado por `SMTP_FROM`; sus límites y condiciones dependen del plan y de la cuenta.

El hosting del frontend debe dirigir las rutas `/autorizacion/*` a la aplicación React (fallback a `index.html`) para que el enlace funcione al abrirse directamente.

El borrador de autorización está en `backend/src/services/consentService.js`. Debe completarse con el nombre y contacto del responsable y ser revisado por la organización antes de utilizarlo oficialmente. La firma dibujada se guarda como evidencia de aceptación en este ATS; no es una firma digital certificada.