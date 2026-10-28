# ATS

## Estructura de la prueba 16PF

Las preguntas se guardan en `preguntas16pf`, con el texto de la pregunta y tres opciones obligatorias (`opcion_a`, `opcion_b`, `opcion_c`). `orden` determina el orden de presentación y `activa` permite retirar una pregunta sin borrar su historial.

`pruebas16pf_intentos` relaciona un aspirante con su intento; la restricción única en `aspirante_id` garantiza un solo intento por aspirante. `pruebas16pf_respuestas` relaciona cada intento con cada pregunta y guarda la letra elegida (`A`, `B` o `C`). Una restricción única evita duplicar la respuesta a la misma pregunta dentro de un intento.

Para crear estas tablas en la base `ats`, ejecuta `backend/database/migrations/002_prueba_16pf.sql`. La migración no inserta preguntas ni inventa contenido de la evaluación.

Ejemplo para consultar el cuestionario y la respuesta registrada para un aspirante (reemplaza `123` por su `aspirante_id`):

```sql
SELECT
  a.id AS aspirante_id,
  a.nombre,
  a.apellido,
  i.estado AS estado_prueba,
  p.id AS pregunta_id,
  p.orden,
  p.pregunta,
  p.opcion_a,
  p.opcion_b,
  p.opcion_c,
  r.opcion_elegida,
  CASE r.opcion_elegida
    WHEN 'A' THEN p.opcion_a
    WHEN 'B' THEN p.opcion_b
    WHEN 'C' THEN p.opcion_c
  END AS respuesta
FROM pruebas16pf_intentos i
JOIN aspirantes a ON a.id = i.aspirante_id
CROSS JOIN preguntas16pf p
LEFT JOIN pruebas16pf_respuestas r
  ON r.intento_id = i.id
 AND r.pregunta_id = p.id
WHERE a.id = 123
ORDER BY p.orden;
```

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

## Portal de prueba 16PF

En la tabla de aspirantes, **Enviar prueba 16PF** envía una invitación personal válida por 24 horas. El correo contiene un enlace, y el aspirante ingresa con su cédula como usuario y contraseña. El enlace se puede reenviar para renovar la vigencia; se conserva el único intento y las respuestas ya guardadas. Una prueba completada no se puede volver a invitar.

El portal permite guardar cada respuesta al seleccionarla, regresar a preguntas anteriores y reanudar desde la primera pregunta pendiente. La finalización exige responder todas las preguntas. Al comenzar se congela una copia ordenada de las preguntas y opciones activas para evitar que cambios posteriores alteren el intento.

Aplica `backend/database/migrations/003_prueba_16pf_portal.sql` después de `002_prueba_16pf.sql`. La configuración de correo y `PUBLIC_APP_URL` usa las mismas variables SMTP documentadas arriba. En producción, publica el frontend por HTTPS y configura el hosting para enviar `/prueba-16pf/*` a la aplicación React (fallback a `index.html`). El portal protege la sesión con una cookie `httpOnly` y limita los intentos fallidos de inicio de sesión por IP.

### Guía exploratoria local para RR. HH.

Cuando la prueba está completada, **Generar guía 16PF** permite elegir una postulación y envía al correo configurado un informe generado por Ollama local. Se consultan las respuestas y la vacante/requisitos seleccionados; no se envían cédula, teléfono ni correo del aspirante al modelo. El informe no se almacena en la base.

Configura estas variables en `backend/.env`:

- `OLLAMA_BASE_URL=http://127.0.0.1:11434` (host local; en Compose puede usarse el hostname local del servicio).
- `OLLAMA_MODEL=qwen2.5:7b`.
- `OLLAMA_TIMEOUT_MS=180000` (rango permitido: 5000–300000 ms).
- `HR_REPORT_EMAIL`: dirección fija del equipo de RR. HH. que recibirá los informes.

Instala e inicia Ollama en el mismo equipo/red local, descarga el modelo (`ollama pull qwen2.5:7b`) y mantén el servicio disponible. El backend rechazará destinos Ollama no locales para evitar enviar datos del cuestionario a servicios externos. La generación se limita a observaciones exploratorias y preguntas para entrevista: no calcula puntuaciones ni baremos, no es una interpretación estandarizada o diagnóstico y no recomienda contratar o descartar. Toda observación requiere revisión profesional y no debe usarse como decisión automatizada.