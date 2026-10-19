import pool from "../db.js";

const scheduleLockId = 9142026;

export const ensureAgendaHorizon = async (businessDates, today, currentTime) => {
  const client = await pool.connect();
  let datesCreated = 0;

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [scheduleLockId]);
    const templateResult = await client.query(
      "SELECT hora::TEXT AS hora, cupos FROM agenda_plantilla_horarios ORDER BY hora",
    );

    if (templateResult.rowCount === 0) {
      throw new Error("La plantilla de agenda debe tener al menos un horario");
    }

    let availableDates = 0;
    for (const dateString of businessDates) {
      if (availableDates >= 4) break;
      const generatedResult = await client.query(
        "SELECT 1 FROM agenda_fechas_generadas WHERE fecha = $1",
        [dateString],
      );

      if (generatedResult.rowCount === 0) {
        const slotsForDate =
          dateString === today
            ? templateResult.rows.filter((slot) => slot.hora.slice(0, 5) > currentTime)
            : templateResult.rows;

        if (slotsForDate.length > 0) {
          await client.query(
            "INSERT INTO agenda_fechas_generadas (fecha) VALUES ($1) ON CONFLICT DO NOTHING",
            [dateString],
          );

          for (const slot of slotsForDate) {
            await client.query(
              `INSERT INTO agenda_horarios (fecha, hora, cupos)
               VALUES ($1, $2, $3)
               ON CONFLICT (fecha, hora) DO NOTHING`,
              [dateString, slot.hora, slot.cupos],
            );
          }
          datesCreated += 1;
        }
      }

      const availabilityResult = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM agenda_horarios
           WHERE fecha = $1
             AND (fecha > $2 OR hora > $3)
         ) AS disponible`,
        [dateString, today, currentTime],
      );
      if (availabilityResult.rows[0].disponible) availableDates += 1;
    }

    await client.query("COMMIT");
    return { datesCreated, availableDates };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const findAgenda = async (today) => {
  const [templateResult, datesResult] = await Promise.all([
    pool.query(
      "SELECT hora::TEXT AS hora, cupos FROM agenda_plantilla_horarios ORDER BY hora",
    ),
    pool.query(
      `SELECT
         f.fecha::TEXT AS fecha,
         COALESCE(
           json_agg(
             json_build_object(
               'id', h.id,
               'hora', to_char(h.hora, 'HH24:MI'),
               'cupos', h.cupos,
               'cupos_ocupados', (
                 SELECT COUNT(*)::INTEGER
                 FROM agenda_asignaciones aa
                 WHERE aa.agenda_horario_id = h.id
               ),
               'cupos_disponibles', GREATEST(
                 h.cupos - (
                   SELECT COUNT(*)::INTEGER
                   FROM agenda_asignaciones aa
                   WHERE aa.agenda_horario_id = h.id
                 ),
                 0
               ),
               'postulantes', COALESCE(
                 (
                   SELECT json_agg(
                     json_build_object(
                       'id', a.id,
                       'nombre', a.nombre,
                       'apellido', a.apellido
                     )
                     ORDER BY a.apellido, a.nombre
                   )
                   FROM agenda_asignaciones aa
                   JOIN aspirantes a ON a.id = aa.aspirante_id
                   WHERE aa.agenda_horario_id = h.id
                 ),
                 '[]'::json
               )
             )
             ORDER BY h.hora
           ) FILTER (WHERE h.id IS NOT NULL),
           '[]'::json
         ) AS horarios
       FROM agenda_fechas_generadas f
       LEFT JOIN agenda_horarios h ON h.fecha = f.fecha
       WHERE f.fecha >= $1
       GROUP BY f.fecha
       ORDER BY f.fecha
       LIMIT 20`,
      [today],
    ),
  ]);

  return {
    plantilla: templateResult.rows.map((slot) => ({
      hora: slot.hora.slice(0, 5),
      cupos: slot.cupos,
    })),
    fechas: datesResult.rows,
  };
};

export const findAvailableApplicants = async () => {
  const result = await pool.query(
    `SELECT a.id, a.nombre, a.apellido
     FROM aspirantes a
     WHERE NOT EXISTS (
       SELECT 1 FROM agenda_asignaciones aa
       WHERE aa.aspirante_id = a.id
     )
     ORDER BY a.apellido, a.nombre`,
  );
  return result.rows;
};

export const replaceAgendaTemplate = async (slots) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [scheduleLockId]);
    await client.query("DELETE FROM agenda_plantilla_horarios");
    for (const slot of slots) {
      await client.query(
        `INSERT INTO agenda_plantilla_horarios (hora, cupos)
         VALUES ($1, $2)`,
        [slot.hora, slot.cupos],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const insertAgendaSlot = async (date, { hora, cupos }) => {
  const result = await pool.query(
    `INSERT INTO agenda_horarios (fecha, hora, cupos)
     SELECT $1, $2, $3
     WHERE EXISTS (
       SELECT 1 FROM agenda_fechas_generadas WHERE fecha = $1
     )
     RETURNING id, to_char(hora, 'HH24:MI') AS hora, cupos`,
    [date, hora, cupos],
  );
  return result.rows[0] ?? null;
};

export const updateAgendaSlot = async (id, { hora, cupos }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const slotResult = await client.query(
      "SELECT id, cupos FROM agenda_horarios WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (slotResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }

    const assignments = await client.query(
      "SELECT COUNT(*)::INTEGER AS total FROM agenda_asignaciones WHERE agenda_horario_id = $1",
      [id],
    );
    const occupied = assignments.rows[0].total;
    if (cupos < occupied) {
      await client.query("ROLLBACK");
      return { capacityExceeded: true, occupied };
    }

    const result = await client.query(
      `UPDATE agenda_horarios
       SET hora = $2, cupos = $3, actualizado_en = NOW()
       WHERE id = $1
       RETURNING id, fecha::TEXT AS fecha, to_char(hora, 'HH24:MI') AS hora, cupos`,
      [id, hora, cupos],
    );
    await client.query("COMMIT");
    return { slot: result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const assignApplicantToSlot = async (slotId, applicantId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const slotResult = await client.query(
      "SELECT cupos FROM agenda_horarios WHERE id = $1 FOR UPDATE",
      [slotId],
    );
    if (slotResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return { notFound: true };
    }

    const assignments = await client.query(
      "SELECT COUNT(*)::INTEGER AS total FROM agenda_asignaciones WHERE agenda_horario_id = $1",
      [slotId],
    );
    const occupied = assignments.rows[0].total;
    if (occupied >= slotResult.rows[0].cupos) {
      await client.query("ROLLBACK");
      return { full: true };
    }

    const result = await client.query(
      `INSERT INTO agenda_asignaciones (agenda_horario_id, aspirante_id)
       VALUES ($1, $2)
       RETURNING id`,
      [slotId, applicantId],
    );
    await client.query("COMMIT");
    return { assignmentId: result.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const removeApplicantFromSlot = async (slotId, applicantId) => {
  const result = await pool.query(
    `DELETE FROM agenda_asignaciones
     WHERE agenda_horario_id = $1 AND aspirante_id = $2
     RETURNING id`,
    [slotId, applicantId],
  );
  return result.rowCount > 0;
};

export const deleteAgendaSlot = async (id) => {
  const result = await pool.query(
    "DELETE FROM agenda_horarios WHERE id = $1 RETURNING id",
    [id],
  );
  return result.rowCount > 0;
};
