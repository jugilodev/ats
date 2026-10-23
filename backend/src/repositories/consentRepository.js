import pool from "../db.js";

export const prepareConsent = async ({
  applicantId,
  tokenHash,
  expiresAt,
  policyVersion,
  policyText,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const applicantResult = await client.query(
      `SELECT id, nombre, apellido, numero_cedula, correo
       FROM aspirantes
       WHERE id = $1
       FOR UPDATE`,
      [applicantId],
    );

    if (!applicantResult.rowCount) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }

    const applicant = applicantResult.rows[0];
    const consentResult = await client.query(
      `SELECT estado
       FROM aspirante_autorizaciones_datos
       WHERE aspirante_id = $1
       FOR UPDATE`,
      [applicantId],
    );

    if (consentResult.rows[0]?.estado === "firmada") {
      await client.query("ROLLBACK");
      return { signed: true };
    }

    const savedConsent = await client.query(
      `INSERT INTO aspirante_autorizaciones_datos (
         aspirante_id,
         estado,
         token_hash,
         expira_en,
         nombre_aspirante,
         apellido_aspirante,
         cedula_aspirante,
         correo_aspirante,
         version_texto,
         texto_aceptado,
         cedula_confirmada,
         firma_data_url,
         enviada_en,
         firmada_en,
         actualizado_en
       )
       VALUES ($1, 'pendiente', $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, NULL, NOW())
       ON CONFLICT (aspirante_id) DO UPDATE
       SET estado = 'pendiente',
           token_hash = EXCLUDED.token_hash,
           expira_en = EXCLUDED.expira_en,
           nombre_aspirante = EXCLUDED.nombre_aspirante,
           apellido_aspirante = EXCLUDED.apellido_aspirante,
           cedula_aspirante = EXCLUDED.cedula_aspirante,
           correo_aspirante = EXCLUDED.correo_aspirante,
           version_texto = EXCLUDED.version_texto,
           texto_aceptado = EXCLUDED.texto_aceptado,
           cedula_confirmada = NULL,
           firma_data_url = NULL,
           enviada_en = NULL,
           firmada_en = NULL,
           actualizado_en = NOW()
       WHERE aspirante_autorizaciones_datos.estado <> 'firmada'
       RETURNING id`,
      [
        applicantId,
        tokenHash,
        expiresAt,
        applicant.nombre,
        applicant.apellido,
        applicant.numero_cedula,
        applicant.correo,
        policyVersion,
        policyText(applicant),
      ],
    );

    if (!savedConsent.rowCount) {
      await client.query("ROLLBACK");
      return { signed: true };
    }

    await client.query("COMMIT");
    return { applicant, expiresAt };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const markConsentEmailSent = async (tokenHash) => {
  const result = await pool.query(
    `UPDATE aspirante_autorizaciones_datos
     SET enviada_en = NOW(), actualizado_en = NOW()
     WHERE token_hash = $1 AND estado = 'pendiente' AND expira_en > NOW()
     RETURNING id`,
    [tokenHash],
  );
  return result.rowCount > 0;
};

export const expirePendingConsent = async (tokenHash) => {
  await pool.query(
    `UPDATE aspirante_autorizaciones_datos
     SET estado = 'vencida', actualizado_en = NOW()
     WHERE token_hash = $1 AND estado = 'pendiente'`,
    [tokenHash],
  );
};

export const findConsentByToken = async (tokenHash) => {
  const result = await pool.query(
    `UPDATE aspirante_autorizaciones_datos
     SET estado = 'vencida', actualizado_en = NOW()
     WHERE token_hash = $1
       AND estado = 'pendiente'
       AND enviada_en IS NOT NULL
       AND expira_en <= NOW()`,
    [tokenHash],
  );

  if (result.rowCount) return { expired: true };

  const consentResult = await pool.query(
    `SELECT nombre_aspirante, apellido_aspirante, cedula_aspirante,
            version_texto, texto_aceptado, expira_en
     FROM aspirante_autorizaciones_datos
     WHERE token_hash = $1
       AND estado = 'pendiente'
       AND enviada_en IS NOT NULL
       AND expira_en > NOW()`,
    [tokenHash],
  );

  return consentResult.rows[0] ?? null;
};

export const acceptConsent = async ({
  tokenHash,
  confirmedId,
  signatureDataUrl,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const consentResult = await client.query(
      `SELECT id, cedula_aspirante, expira_en <= NOW() AS vencida
       FROM aspirante_autorizaciones_datos
       WHERE token_hash = $1
         AND estado = 'pendiente'
         AND enviada_en IS NOT NULL
       FOR UPDATE`,
      [tokenHash],
    );

    if (!consentResult.rowCount) {
      await client.query("ROLLBACK");
      return { invalid: true };
    }

    const consent = consentResult.rows[0];
    if (consent.vencida) {
      await client.query(
        `UPDATE aspirante_autorizaciones_datos
         SET estado = 'vencida', actualizado_en = NOW()
         WHERE id = $1`,
        [consent.id],
      );
      await client.query("COMMIT");
      return { expired: true };
    }

    if (confirmedId !== consent.cedula_aspirante) {
      await client.query("ROLLBACK");
      return { idMismatch: true };
    }

    await client.query(
      `UPDATE aspirante_autorizaciones_datos
       SET estado = 'firmada',
           token_hash = NULL,
           expira_en = NULL,
           cedula_confirmada = $2,
           firma_data_url = $3,
           firmada_en = NOW(),
           actualizado_en = NOW()
       WHERE id = $1`,
      [consent.id, confirmedId, signatureDataUrl],
    );
    await client.query("COMMIT");
    return { accepted: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
