import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import Field from "../components/Field.jsx";
import FormMessage from "../components/FormMessage.jsx";

const emptyVacancy = {
  nombre: "",
  descripcion: "",
  requisitos: [],
  killer_questions: [],
};

function RequirementSelector({ requirements, selected, onToggle, onUpdate }) {
  if (requirements.length === 0) {
    return <p className="empty">Crea requisitos antes de asignarlos.</p>;
  }

  return (
    <div className="requirement-options">
      {requirements.map((requirement) => {
        const selectedRequirement = selected.find(
          (item) => String(item.requisito_id) === String(requirement.id),
        );

        return (
          <div className="requirement-option" key={requirement.id}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(selectedRequirement)}
                onChange={() => onToggle(requirement.id)}
              />
              <span>{requirement.nombre}</span>
            </label>
            {selectedRequirement && (
              <div className="requirement-settings">
                <label className="mandatory-toggle">
                  <input
                    type="checkbox"
                    checked={selectedRequirement.obligatorio}
                    onChange={(event) =>
                      onUpdate(requirement.id, {
                        obligatorio: event.target.checked,
                        peso: event.target.checked ? null : 1,
                      })
                    }
                  />
                  Obligatorio
                </label>
                {!selectedRequirement.obligatorio && (
                  <select
                    aria-label={`Puntuación para ${requirement.nombre}`}
                    value={selectedRequirement.peso}
                    onChange={(event) =>
                      onUpdate(requirement.id, {
                        peso: Number(event.target.value),
                      })
                    }
                  >
                    {[1, 2, 3].map((weight) => (
                      <option key={weight} value={weight}>
                        Puntuación {weight}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KillerQuestionEditor({ questions, onAdd, onUpdate, onRemove }) {
  return (
    <div className="killer-questions">
      <div className="section-heading">
        <label className="field-label">Killer Questions</label>
        <button className="text-button" onClick={onAdd} type="button">
          Agregar pregunta
        </button>
      </div>
      {questions.length === 0 ? (
        <p className="empty">Esta vacante no tiene Killer Questions.</p>
      ) : (
        <div className="killer-question-list">
          {questions.map((question, index) => (
            <div className="killer-question" key={index}>
              <Field label={`Pregunta ${index + 1}`}>
                <input
                  maxLength="500"
                  required
                  value={question.nombre}
                  onChange={(event) =>
                    onUpdate(index, { nombre: event.target.value })
                  }
                />
              </Field>
              <Field label="Respuesta esperada">
                <select
                  required
                  value={
                    question.respuesta_esperada === null
                      ? ""
                      : question.respuesta_esperada
                  }
                  onChange={(event) =>
                    onUpdate(index, {
                      respuesta_esperada: event.target.value,
                    })
                  }
                >
                  <option value="">Selecciona si o no</option>
                  <option value="si">si</option>
                  <option value="no">no</option>
                </select>
              </Field>
              <button
                className="text-button delete-button"
                onClick={() => onRemove(index)}
                type="button"
              >
                Eliminar pregunta
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VacancyItem({ vacancy, onEdit, onToggleActive, onRemove }) {
  return (
    <li>
      <div className="item-header">
        <strong>{vacancy.nombre}</strong>
        <span
          className={`status ${vacancy.activa ? "active" : "inactive"}`}
        >
          {vacancy.activa ? "Activa" : "Inhabilitada"}
        </span>
      </div>
      <span>{vacancy.descripcion || "Sin descripción"}</span>
      <div className="chips">
        {vacancy.requisitos.map((requirement) => (
          <span className="chip" key={requirement.id}>
            {requirement.nombre} ·{" "}
            {requirement.obligatorio
              ? "Obligatorio"
              : `Puntuación ${requirement.peso}`}
          </span>
        ))}
      </div>
      {vacancy.killer_questions.length > 0 && (
        <div className="killer-question-summary">
          <strong>Killer Questions</strong>
          {vacancy.killer_questions.map((question) => (
            <span key={question.id}>
              {question.nombre} · Respuesta esperada:{" "}
              {question.respuesta_esperada}
            </span>
          ))}
        </div>
      )}
      <div className="item-actions">
        <button
          className="text-button"
          onClick={() => onEdit(vacancy)}
          type="button"
        >
          Editar
        </button>
        <button
          className="text-button"
          onClick={() => onToggleActive(vacancy)}
          type="button"
        >
          {vacancy.activa ? "Inhabilitar" : "Reactivar"}
        </button>
        <button
          className="text-button delete-button"
          onClick={() => onRemove(vacancy)}
          type="button"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

export default function VacancyPage() {
  const [form, setForm] = useState(emptyVacancy);
  const [editingId, setEditingId] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [requirementData, vacancyData] = await Promise.all([
        apiRequest("/requisitos"),
        apiRequest("/vacantes"),
      ]);
      setRequirements(requirementData.requisitos);
      setVacancies(vacancyData.vacantes);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const addKillerQuestion = () => {
    setForm((current) => ({
      ...current,
      killer_questions: [
        ...current.killer_questions,
        { nombre: "", respuesta_esperada: null },
      ],
    }));
  };

  const updateKillerQuestion = (index, changes) => {
    setForm((current) => ({
      ...current,
      killer_questions: current.killer_questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...changes } : question,
      ),
    }));
  };

  const removeKillerQuestion = (index) => {
    setForm((current) => ({
      ...current,
      killer_questions: current.killer_questions.filter(
        (_question, questionIndex) => questionIndex !== index,
      ),
    }));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyVacancy);
    setEditingId(null);
    setError("");
    setMessage("");
  };

  const toggleRequirement = (id) => {
    setForm((current) => {
      const selected = current.requisitos.some(
        (item) => String(item.requisito_id) === String(id),
      );

      return {
        ...current,
        requisitos: selected
          ? current.requisitos.filter(
              (item) => String(item.requisito_id) !== String(id),
            )
          : [
              ...current.requisitos,
              { requisito_id: id, obligatorio: true, peso: null },
            ],
      };
    });
  };

  const updateRequirement = (id, changes) => {
    setForm((current) => ({
      ...current,
      requisitos: current.requisitos.map((item) =>
        String(item.requisito_id) === String(id)
          ? { ...item, ...changes }
          : item,
      ),
    }));
  };

  const editVacancy = (vacancy) => {
    setEditingId(vacancy.id);
    setForm({
      nombre: vacancy.nombre,
      descripcion: vacancy.descripcion || "",
      requisitos: vacancy.requisitos.map((requirement) => ({
        requisito_id: String(requirement.id),
        obligatorio: requirement.obligatorio,
        peso: requirement.peso,
      })),
      killer_questions: vacancy.killer_questions.map((question) => ({
        nombre: question.nombre,
        respuesta_esperada: question.respuesta_esperada,
      })),
    });
    setError("");
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const editing = editingId !== null;
      await apiRequest(
        editing ? `/vacantes/${editingId}` : "/vacantes",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(form),
        },
      );
      resetForm();
      setMessage(editing ? "Vacante actualizada." : "Vacante creada.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const setVacancyActive = async (vacancy) => {
    setError("");
    try {
      await apiRequest(`/vacantes/${vacancy.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !vacancy.activa }),
      });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeVacancy = async (vacancy) => {
    if (!window.confirm(`¿Borrar la vacante "${vacancy.nombre}"?`)) return;

    setError("");
    try {
      await apiRequest(`/vacantes/${vacancy.id}`, { method: "DELETE" });
      if (editingId === vacancy.id) resetForm();
      setMessage("Vacante eliminada.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SELECCIÓN</p>
            <h2>{editingId === null ? "Crear vacante" : "Editar vacante"}</h2>
          </div>
        </div>
        <p className="muted">
          Define cuáles requisitos son obligatorios. Los no obligatorios tienen
          una puntuación de 1 a 3.
        </p>
        <form className="stack-form" onSubmit={submit}>
          <Field label="Nombre de la vacante">
            <input
              required
              value={form.nombre}
              onChange={(event) =>
                setForm({ ...form, nombre: event.target.value })
              }
            />
          </Field>
          <Field label="Descripción">
            <textarea
              rows="3"
              value={form.descripcion}
              onChange={(event) =>
                setForm({ ...form, descripcion: event.target.value })
              }
            />
          </Field>
          <label className="field-label">Requisitos y condición</label>
          <RequirementSelector
            requirements={requirements}
            selected={form.requisitos}
            onToggle={toggleRequirement}
            onUpdate={updateRequirement}
          />
          <KillerQuestionEditor
            questions={form.killer_questions}
            onAdd={addKillerQuestion}
            onUpdate={updateKillerQuestion}
            onRemove={removeKillerQuestion}
          />
          <FormMessage error={error} message={message} />
          <div className="form-actions">
            <button className="primary" disabled={saving}>
              {saving
                ? "Guardando..."
                : editingId === null
                  ? "Guardar vacante"
                  : "Guardar cambios"}
            </button>
            {editingId !== null && (
              <button
                className="secondary"
                onClick={resetForm}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">LISTADO</p>
            <h2>Vacantes</h2>
          </div>
          <span className="count">{vacancies.length}</span>
        </div>
        {vacancies.length === 0 ? (
          <p className="empty">Aún no hay vacantes.</p>
        ) : (
          <ul className="item-list">
            {vacancies.map((vacancy) => (
              <VacancyItem
                key={vacancy.id}
                vacancy={vacancy}
                onEdit={editVacancy}
                onToggleActive={setVacancyActive}
                onRemove={removeVacancy}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
