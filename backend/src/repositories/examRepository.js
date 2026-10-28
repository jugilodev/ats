import pool from "../db.js";

export const prepareExamInvitation = async ({
  applicantId,
  tokenHash,
  expiresAt,
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

    const attemptResult = await client.query(
      `SELECT id, estado
       FROM pruebas16pf_intentos
       WHERE aspirante_id = $1
       FOR UPDATE`,
      [applicantId],
    );

    if (attemptResult.rows[0]?.estado === "completada") {
      await client.query("ROLLBACK");
      return { completed: true };
    }

    const { rows: [questionCount] } = await client.query(
      "SELECT COUNT(*)::int AS total FROM preguntas16pf WHERE activa = TRUE",
    );
    if (questionCount.total < 1) {
      await client.query("ROLLBACK");
      return { noQuestions: true };
    }

    if (!attemptResult.rowCount) {
      await client.query(
        `INSERT INTO pruebas16pf_intentos (
           aspirante_id, estado, iniciada_en, completada_en,
           invitacion_token_hash, invitacion_expira_en, invitacion_enviada_en,
           actualizado_en
         )
         VALUES ($1, 'invitada', NULL, NULL, $2, $3, NULL, NOW())`,
        [applicantId, tokenHash, expiresAt],
      );
    } else {
      await client.query(
        `UPDATE pruebas16pf_intentos
         SET invitacion_token_hash = $2,
             invitacion_expira_en = $3,
             invitacion_enviada_en = NULL,
             actualizado_en = NOW()
         WHERE id = $1`,
        [attemptResult.rows[0].id, tokenHash, expiresAt],
      );
    }

    await client.query("COMMIT");
    return {
      aspirante: applicantResult.rows[0],
      estado: attemptResult.rows[0]?.estado ?? "invitada",
      totalPreguntas: questionCount.total,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const markExamInvitationSent = async (tokenHash) => {
  const result = await pool.query(
    `UPDATE pruebas16pf_intentos
     SET invitacion_enviada_en = NOW(), actualizado_en = NOW()
     WHERE invitacion_token_hash = $1
       AND invitacion_expira_en > NOW()
       AND estado <> 'completada'
     RETURNING id`,
    [tokenHash],
  );
  return result.rowCount > 0;
};

export const invalidateExamInvitation = async (tokenHash) => {
  await pool.query(
    `UPDATE pruebas16pf_intentos
     SET invitacion_token_hash = NULL,
         invitacion_expira_en = NULL,
         invitacion_enviada_en = NULL,
         actualizado_en = NOW()
     WHERE invitacion_token_hash = $1
       AND estado <> 'completada'`,
    [tokenHash],
  );
};

export const findExamInvitation = async (tokenHash) => {
  const expiredResult = await pool.query(
    `UPDATE pruebas16pf_intentos
     SET invitacion_token_hash = NULL,
         invitacion_expira_en = NULL,
         invitacion_enviada_en = NULL,
         actualizado_en = NOW()
     WHERE invitacion_token_hash = $1
       AND estado <> 'completada'
       AND invitacion_enviada_en IS NOT NULL
       AND invitacion_expira_en <= NOW()
     RETURNING id`,
    [tokenHash],
  );

  if (expiredResult.rowCount) return { expired: true };

  const result = await pool.query(
    `SELECT i.id AS intento_id, i.aspirante_id, i.estado,
            a.numero_cedula, a.nombre
     FROM pruebas16pf_intentos i
     JOIN aspirantes a ON a.id = i.aspirante_id
     WHERE i.invitacion_token_hash = $1
       AND i.estado <> 'completada'
       AND i.invitacion_enviada_en IS NOT NULL
       AND i.invitacion_expira_en > NOW()`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
};

export const getLoginBlock = async (ipHash) => {
  const result = await pool.query(
    `SELECT bloqueado_hasta > NOW() AS bloqueado
     FROM pruebas16pf_login_bloqueos
     WHERE ip_hash = $1`,
    [ipHash],
  );
  return Boolean(result.rows[0]?.bloqueado);
};

export const recordFailedLogin = async (ipHash) => {
  const result = await pool.query(
    `INSERT INTO pruebas16pf_login_bloqueos (
       ip_hash, intentos_fallidos, ventana_inicia_en, bloqueado_hasta, actualizado_en
     )
     VALUES ($1, 1, NOW(), NULL, NOW())
     ON CONFLICT (ip_hash) DO UPDATE
     SET intentos_fallidos = CASE
           WHEN pruebas16pf_login_bloqueos.ventana_inicia_en > NOW() - INTERVAL '15 minutes'
             THEN LEAST(pruebas16pf_login_bloqueos.intentos_fallidos + 1, 10)
           ELSE 1
         END,
         ventana_inicia_en = CASE
           WHEN pruebas16pf_login_bloqueos.ventana_inicia_en > NOW() - INTERVAL '15 minutes'
             THEN pruebas16pf_login_bloqueos.ventana_inicia_en
           ELSE NOW()
         END,
         bloqueado_hasta = CASE
           WHEN pruebas16pf_login_bloqueos.ventana_inicia_en > NOW() - INTERVAL '15 minutes'
             AND pruebas16pf_login_bloqueos.intentos_fallidos >= 9
             THEN NOW() + INTERVAL '15 minutes'
           WHEN pruebas16pf_login_bloqueos.ventana_inicia_en <= NOW() - INTERVAL '15 minutes'
             THEN NULL
           ELSE pruebas16pf_login_bloqueos.bloqueado_hasta
         END,
         actualizado_en = NOW()
     RETURNING intentos_fallidos, bloqueado_hasta`,
    [ipHash],
  );
  return result.rows[0];
};

export const clearLoginBlock = async (ipHash) => {
  await pool.query(
    "DELETE FROM pruebas16pf_login_bloqueos WHERE ip_hash = $1",
    [ipHash],
  );
};

export const getExamState = async (attemptId, requestedOrder = null) => {
  const attemptResult = await pool.query(
    `SELECT i.id, i.estado, a.nombre
     FROM pruebas16pf_intentos i
     JOIN aspirantes a ON a.id = i.aspirante_id
     WHERE i.id = $1`,
    [attemptId],
  );

  if (!attemptResult.rowCount) return null;
  const attempt = attemptResult.rows[0];

  if (attempt.estado === "completada") {
    return {
      estado: attempt.estado,
      nombre: attempt.nombre,
      total: 0,
      respondidas: 0,
      pregunta: null,
    };
  }

  if (attempt.estado === "invitada") {
    const { rows: [questionCount] } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM preguntas16pf WHERE activa = TRUE",
    );
    return {
      estado: attempt.estado,
      nombre: attempt.nombre,
      total: questionCount.total,
    };
  }

  const statsResult = await pool.query(
    `WITH preguntas AS (
       SELECT ip.pregunta_id,
              ip.orden,
              row_number() OVER (ORDER BY ip.orden) AS numero
       FROM pruebas16pf_intento_preguntas ip
       WHERE ip.intento_id = $1
     )
     SELECT COUNT(*)::int AS total,
            COUNT(r.id)::int AS respondidas,
            MIN(p.numero) FILTER (WHERE r.id IS NULL)::int AS primera_sin_responder,
            MAX(p.numero)::int AS ultima
     FROM preguntas p
     LEFT JOIN pruebas16pf_respuestas r
       ON r.intento_id = $1 AND r.pregunta_id = p.pregunta_id`,
    [attemptId],
  );

  const stats = statsResult.rows[0];
  const currentOrder = requestedOrder ?? stats.primera_sin_responder ?? stats.ultima;
  let question = null;

  if (currentOrder !== null) {
    const questionResult = await pool.query(
      `WITH preguntas AS (
         SELECT ip.pregunta_id, ip.orden, ip.pregunta, ip.opcion_a, ip.opcion_b, ip.opcion_c,
                row_number() OVER (ORDER BY ip.orden) AS numero
         FROM pruebas16pf_intento_preguntas ip
         WHERE ip.intento_id = $1
       )
       SELECT p.pregunta_id AS id, p.orden, p.numero, p.pregunta,
              p.opcion_a, p.opcion_b, p.opcion_c, r.opcion_elegida
       FROM preguntas p
       LEFT JOIN pruebas16pf_respuestas r
         ON r.intento_id = $1 AND r.pregunta_id = p.pregunta_id
       WHERE p.numero = $2`,
      [attemptId, currentOrder],
    );
    question = questionResult.rows[0] ?? null;
  }

  return {
    estado: attempt.estado,
    nombre: attempt.nombre,
    total: stats.total,
    respondidas: stats.respondidas,
    primera_sin_responder: stats.primera_sin_responder,
    pregunta: question,
  };
};

export const startExamAttempt = async (attemptId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const attemptResult = await client.query(
      "SELECT estado FROM pruebas16pf_intentos WHERE id = $1 FOR UPDATE",
      [attemptId],
    );
    if (!attemptResult.rowCount) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }
    if (attemptResult.rows[0].estado === "completada") {
      await client.query("ROLLBACK");
      return { completed: true };
    }
    if (attemptResult.rows[0].estado === "invitada") {
      await client.query(
        `INSERT INTO pruebas16pf_intento_preguntas (
           intento_id, pregunta_id, orden, pregunta, opcion_a, opcion_b, opcion_c
         )
         SELECT $1, id, orden, pregunta, opcion_a, opcion_b, opcion_c
         FROM preguntas16pf
         WHERE activa = TRUE
         ORDER BY orden
         ON CONFLICT (intento_id, pregunta_id) DO NOTHING`,
        [attemptId],
      );
      const { rows: [snapshot] } = await client.query(
        "SELECT COUNT(*)::int AS total FROM pruebas16pf_intento_preguntas WHERE intento_id = $1",
        [attemptId],
      );
      if (snapshot.total < 1) {
        await client.query("ROLLBACK");
        return { noQuestions: true };
      }
      await client.query(
        `UPDATE pruebas16pf_intentos
         SET estado = 'en_progreso', iniciada_en = NOW(), actualizado_en = NOW()
         WHERE id = $1`,
        [attemptId],
      );
    }
    await client.query("COMMIT");
    return { started: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const saveExamAnswer = async ({ attemptId, questionId, option }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const attemptResult = await client.query(
      `SELECT estado
       FROM pruebas16pf_intentos
       WHERE id = $1
       FOR UPDATE`,
      [attemptId],
    );
    if (!attemptResult.rowCount) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }
    if (attemptResult.rows[0].estado !== "en_progreso") {
      await client.query("ROLLBACK");
      return { unavailable: true };
    }

    const questionResult = await client.query(
      `SELECT 1 FROM pruebas16pf_intento_preguntas
       WHERE intento_id = $1 AND pregunta_id = $2`,
      [attemptId, questionId],
    );
    if (!questionResult.rowCount) {
      await client.query("ROLLBACK");
      return { questionNotFound: true };
    }

    await client.query(
      `INSERT INTO pruebas16pf_respuestas (
         intento_id, pregunta_id, opcion_elegida, actualizado_en
       )
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (intento_id, pregunta_id) DO UPDATE
       SET opcion_elegida = EXCLUDED.opcion_elegida,
           actualizado_en = NOW()`,
      [attemptId, questionId, option],
    );
    await client.query(
      "UPDATE pruebas16pf_intentos SET actualizado_en = NOW() WHERE id = $1",
      [attemptId],
    );
    await client.query("COMMIT");
    return { saved: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const completeExamAttempt = async (attemptId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const attemptResult = await client.query(
      `SELECT estado
       FROM pruebas16pf_intentos
       WHERE id = $1
       FOR UPDATE`,
      [attemptId],
    );
    if (!attemptResult.rowCount) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }
    if (attemptResult.rows[0].estado === "completada") {
      await client.query("ROLLBACK");
      return { completed: true };
    }
    if (attemptResult.rows[0].estado !== "en_progreso") {
      await client.query("ROLLBACK");
      return { unavailable: true };
    }

    const { rows: [progress] } = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(r.id)::int AS respondidas
       FROM pruebas16pf_intento_preguntas p
       LEFT JOIN pruebas16pf_respuestas r
         ON r.intento_id = p.intento_id AND r.pregunta_id = p.pregunta_id
       WHERE p.intento_id = $1`,
      [attemptId],
    );
    if (progress.total < 1 || progress.respondidas !== progress.total) {
      await client.query("ROLLBACK");
      return {
        incomplete: true,
        total: progress.total,
        respondidas: progress.respondidas,
      };
    }

    await client.query(
      `UPDATE pruebas16pf_intentos
       SET estado = 'completada',
           completada_en = NOW(),
           invitacion_token_hash = NULL,
           invitacion_expira_en = NULL,
           invitacion_enviada_en = NULL,
           actualizado_en = NOW()
       WHERE id = $1`,
      [attemptId],
    );
    await client.query("COMMIT");
    return { completed: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
