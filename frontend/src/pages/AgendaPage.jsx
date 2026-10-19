import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import Field from "../components/Field.jsx";
import FormMessage from "../components/FormMessage.jsx";

const emptySlot = { hora: "12:00", cupos: 3 };

function formatDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function TemplateEditor({ slots, onChange, onSave, saving }) {
  const updateSlot = (index, changes) => {
    onChange(
      slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...changes } : slot,
      ),
    );
  };

  return (
    <details className="panel agenda-template">
      <summary className="agenda-template-summary">
        <span>
          <span className="eyebrow">GENERADOR AUTOMÁTICO</span>
          <strong>Plantilla de horarios</strong>
        </span>
        <span className="text-button">Configurar</span>
      </summary>
      <p className="muted">
        La plantilla se aplica a nuevas fechas. Los horarios ya generados no
        cambian al guardarla.
      </p>
      <form className="stack-form" onSubmit={onSave}>
        <div className="template-slots">
          {slots.map((slot, index) => (
            <div className="template-slot" key={index}>
              <Field label="Hora">
                <input
                  required
                  type="time"
                  value={slot.hora}
                  onChange={(event) =>
                    updateSlot(index, { hora: event.target.value })
                  }
                />
              </Field>
              <Field label="Cupos">
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={slot.cupos}
                  onChange={(event) =>
                    updateSlot(index, { cupos: event.target.value })
                  }
                />
              </Field>
              <button
                className="text-button delete-button"
                onClick={() =>
                  onChange(
                    slots.filter((_item, slotIndex) => slotIndex !== index),
                  )
                }
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button
            className="text-button"
            onClick={() => onChange([...slots, { ...emptySlot }])}
            type="button"
          >
            Agregar horario
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar plantilla"}
          </button>
        </div>
      </form>
    </details>
  );
}

function AgendaDate({
  date,
  applicants,
  onUpdateSlot,
  onSaveSlot,
  onAddSlot,
  onRemoveSlot,
  onAssignApplicant,
  onRemoveApplicant,
  saving,
}) {
  const [newSlot, setNewSlot] = useState(emptySlot);
  const [selectedApplicants, setSelectedApplicants] = useState({});
  const totalCapacity = date.horarios.reduce(
    (total, slot) => total + Number(slot.cupos),
    0,
  );
  const occupied = date.horarios.reduce(
    (total, slot) => total + Number(slot.cupos_ocupados),
    0,
  );
  const available = date.horarios.reduce(
    (total, slot) =>
      total + Math.max(Number(slot.cupos) - Number(slot.cupos_ocupados), 0),
    0,
  );

  const submitNewSlot = async (event) => {
    event.preventDefault();
    const saved = await onAddSlot(date.fecha, newSlot);
    if (saved) setNewSlot(emptySlot);
  };

  const submitApplicant = async (event, slot) => {
    event.preventDefault();
    const applicantId = selectedApplicants[slot.id];
    if (!applicantId) return;
    const saved = await onAssignApplicant(slot.id, applicantId);
    if (saved) {
      setSelectedApplicants((current) => ({
        ...current,
        [slot.id]: "",
      }));
    }
  };

  return (
    <details className="agenda-date panel">
      <summary className="agenda-date-summary">
        <span>
          <span className="eyebrow">FECHA HÁBIL</span>
          <strong>{formatDate(date.fecha)}</strong>
        </span>
        <span className="agenda-day-capacity">
          {available} disponibles · {occupied}/{totalCapacity} ocupados
        </span>
      </summary>
      {date.horarios.length === 0 ? (
        <p className="empty">No hay horarios disponibles para esta fecha.</p>
      ) : (
        <div className="agenda-slots">
          {date.horarios.map((slot) => (
            <article className="agenda-slot-card" key={slot.id}>
              <form
                className="agenda-slot"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSaveSlot(slot);
                }}
              >
                <Field label="Hora">
                  <input
                    required
                    type="time"
                    value={slot.hora}
                    onChange={(event) =>
                      onUpdateSlot(slot.id, { hora: event.target.value })
                    }
                  />
                </Field>
                <Field label="Cupos">
                  <input
                    required
                    type="number"
                    min={slot.cupos_ocupados}
                    max="100"
                    value={slot.cupos}
                    onChange={(event) =>
                      onUpdateSlot(slot.id, { cupos: event.target.value })
                    }
                  />
                </Field>
                <button className="primary" disabled={saving === slot.id}>
                  {saving === slot.id ? "Guardando..." : "Guardar"}
                </button>
                <button
                  className="text-button delete-button"
                  disabled={saving === slot.id || slot.cupos_ocupados > 0}
                  onClick={() => onRemoveSlot(slot)}
                  type="button"
                  title={
                    slot.cupos_ocupados > 0
                      ? "Retira primero los postulantes asignados"
                      : "Quitar horario"
                  }
                >
                  Quitar
                </button>
              </form>
              <p className="slot-availability">
                {slot.cupos_ocupados} ocupados ·{" "}
                {Math.max(Number(slot.cupos) - slot.cupos_ocupados, 0)}{" "}
                disponibles de {slot.cupos}
              </p>
              {slot.postulantes.length > 0 && (
                <ul className="scheduled-applicants">
                  {slot.postulantes.map((applicant) => (
                    <li key={applicant.id}>
                      <span>
                        {applicant.nombre} {applicant.apellido}
                      </span>
                      <button
                        className="text-button delete-button"
                        disabled={saving === slot.id}
                        onClick={() =>
                          onRemoveApplicant(slot.id, applicant.id)
                        }
                        type="button"
                      >
                        Retirar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {slot.cupos_disponibles > 0 && (
                <form
                  className="assign-applicant-form"
                  onSubmit={(event) => submitApplicant(event, slot)}
                >
                  <select
                    aria-label={`Postulante para ${slot.hora}`}
                    required
                    value={selectedApplicants[slot.id] || ""}
                    onChange={(event) =>
                      setSelectedApplicants((current) => ({
                        ...current,
                        [slot.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona un postulante</option>
                    {applicants.map((applicant) => (
                      <option key={applicant.id} value={applicant.id}>
                        {applicant.nombre} {applicant.apellido}
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary"
                    disabled={
                      saving === `assign-${slot.id}` || applicants.length === 0
                    }
                  >
                    Asignar
                  </button>
                </form>
              )}
              {slot.cupos_disponibles > 0 && applicants.length === 0 && (
                <p className="slot-availability">
                  No hay postulantes sin horario asignado.
                </p>
              )}
              {slot.cupos_disponibles === 0 && (
                <p className="slot-full">Este horario está completo.</p>
              )}
            </article>
          ))}
        </div>
      )}
      <form className="agenda-slot add-agenda-slot" onSubmit={submitNewSlot}>
        <Field label="Nueva hora">
          <input
            required
            type="time"
            value={newSlot.hora}
            onChange={(event) =>
              setNewSlot({ ...newSlot, hora: event.target.value })
            }
          />
        </Field>
        <Field label="Cupos">
          <input
            required
            type="number"
            min="1"
            max="100"
            value={newSlot.cupos}
            onChange={(event) =>
              setNewSlot({ ...newSlot, cupos: event.target.value })
            }
          />
        </Field>
        <button className="secondary" disabled={saving === "new"}>
          {saving === "new" ? "Agregando..." : "Agregar horario"}
        </button>
      </form>
    </details>
  );
}

export default function AgendaPage() {
  const [agenda, setAgenda] = useState({ plantilla: [], fechas: [] });
  const [applicants, setApplicants] = useState([]);
  const [template, setTemplate] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null);

  const load = async () => {
    try {
      const [data, applicantData] = await Promise.all([
        apiRequest("/agenda"),
        apiRequest("/agenda/postulantes-disponibles"),
      ]);
      setAgenda(data);
      setTemplate(data.plantilla);
      setApplicants(applicantData.postulantes);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateLocalSlot = (id, changes) => {
    setAgenda((current) => ({
      ...current,
      fechas: current.fechas.map((date) => ({
        ...date,
        horarios: date.horarios.map((item) =>
          item.id === id
            ? { ...item, ...changes, dirty: true }
            : item,
        ),
      })),
    }));
  };

  const saveSlot = async (slot) => {
    setError("");
    setMessage("");
    setSavingSlot(slot.id);
    try {
      const data = await apiRequest(`/agenda/horarios/${slot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hora: slot.hora, cupos: Number(slot.cupos) }),
      });
      await load();
      setMessage("Horario actualizado.");
    } catch (requestError) {
      setError(requestError.message);
      await load();
    } finally {
      setSavingSlot(null);
    }
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingTemplate(true);
    try {
      const data = await apiRequest("/agenda/plantilla", {
        method: "PUT",
        body: JSON.stringify({
          horarios: template.map((slot) => ({
            hora: slot.hora,
            cupos: Number(slot.cupos),
          })),
        }),
      });
      setAgenda(data);
      setTemplate(data.plantilla);
      setMessage("Plantilla actualizada.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const addSlot = async (date, slot) => {
    setError("");
    setMessage("");
    setSavingSlot("new");
    try {
      const data = await apiRequest(`/agenda/fechas/${date}/horarios`, {
        method: "POST",
        body: JSON.stringify({ hora: slot.hora, cupos: Number(slot.cupos) }),
      });
      setAgenda(data);
      setTemplate(data.plantilla);
      setMessage("Horario agregado.");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setSavingSlot(null);
    }
  };

  const removeSlot = async (slot) => {
    if (!window.confirm(`¿Quitar el horario de las ${slot.hora}?`)) return;
    setError("");
    setMessage("");
    setSavingSlot(slot.id);
    try {
      const data = await apiRequest(`/agenda/horarios/${slot.id}`, {
        method: "DELETE",
      });
      setAgenda(data);
      setTemplate(data.plantilla);
      setMessage("Horario eliminado.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSlot(null);
    }
  };

  const assignApplicant = async (slotId, applicantId) => {
    setError("");
    setMessage("");
    setSavingSlot(`assign-${slotId}`);
    try {
      await apiRequest(`/agenda/horarios/${slotId}/postulantes`, {
        method: "POST",
        body: JSON.stringify({ aspirante_id: Number(applicantId) }),
      });
      await load();
      setMessage("Postulante asignado al horario.");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setSavingSlot(null);
    }
  };

  const removeApplicant = async (slotId, applicantId) => {
    setError("");
    setMessage("");
    setSavingSlot(slotId);
    try {
      await apiRequest(
        `/agenda/horarios/${slotId}/postulantes/${applicantId}`,
        { method: "DELETE" },
      );
      await load();
      setMessage("Postulante retirado del horario.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSlot(null);
    }
  };

  return (
    <div className="agenda-page">
      <p className="muted agenda-intro">
        El sistema conserva cuatro fechas hábiles disponibles. No genera
        horarios en fines de semana ni festivos nacionales de Colombia. Cada
        postulante puede tener un solo horario asignado.
      </p>
      <FormMessage error={error} message={message} />
      <TemplateEditor
        slots={template}
        onChange={setTemplate}
        onSave={saveTemplate}
        saving={savingTemplate}
      />
      <section className="agenda-calendar">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">DISPONIBILIDAD</p>
            <h2>Agenda de entrevistas</h2>
          </div>
          <button className="text-button" onClick={load} type="button">
            Actualizar
          </button>
        </div>
        {agenda.fechas.length === 0 ? (
          <p className="empty">Todavía no hay fechas generadas.</p>
        ) : (
          <div className="agenda-date-list">
            {agenda.fechas.map((date) => (
              <AgendaDate
                key={date.fecha}
                date={date}
                applicants={applicants}
                onUpdateSlot={updateLocalSlot}
                onSaveSlot={saveSlot}
                onAddSlot={addSlot}
                onRemoveSlot={removeSlot}
                onAssignApplicant={assignApplicant}
                onRemoveApplicant={removeApplicant}
                saving={savingSlot}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
