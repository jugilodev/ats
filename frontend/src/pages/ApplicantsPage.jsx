import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import Field from "../components/Field.jsx";
import FormMessage from "../components/FormMessage.jsx";

const emptyApplicant = {
  nombre: "",
  apellido: "",
  numero_cedula: "",
  numero_celular: "",
  correo: "",
};

const fields = [
  ["nombre", "Nombre", "text"],
  ["apellido", "Apellido", "text"],
  ["numero_cedula", "Cédula", "text"],
  ["numero_celular", "Celular", "tel"],
  ["correo", "Correo electrónico", "email"],
];

function ApplicantsTable({
  applicants,
  onEdit,
  onDelete,
  onSendAuthorization,
  onSendExam,
  onGenerateReport,
  deletingId,
  sendingId,
  sendingExamId,
  reportBusy,
  generatingReportId,
}) {
  if (applicants.length === 0) {
    return <p className="empty">Aún no hay aspirantes registrados.</p>;
  }

  return (
    <div className="applicants-table-wrap">
      <table className="applicants-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Celular</th>
            <th>Correo electrónico</th>
            <th>Tratamiento de datos</th>
            <th>Prueba 16PF</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((applicant) => (
            <tr key={applicant.id}>
              <td data-label="Nombre">
                <strong>{applicant.nombre} {applicant.apellido}</strong>
              </td>
              <td data-label="Cédula">{applicant.numero_cedula}</td>
              <td data-label="Celular">{applicant.numero_celular}</td>
              <td data-label="Correo electrónico">{applicant.correo}</td>
              <td data-label="Tratamiento de datos">
                {applicant.autorizacion_estado === "firmada"
                  ? "Firmada"
                  : applicant.autorizacion_estado === "pendiente" &&
                      new Date(applicant.autorizacion_expira_en).getTime() > Date.now()
                    ? "Pendiente"
                    : applicant.autorizacion_estado
                      ? "Enlace vencido"
                      : "Sin enviar"}
              </td>
              <td data-label="Prueba 16PF">
                {applicant.prueba16pf_estado === "completada"
                  ? "Completada"
                  : applicant.prueba16pf_estado === "en_progreso"
                    ? `En progreso · ${applicant.prueba16pf_respondidas || 0}/${applicant.prueba16pf_total || 0}`
                    : applicant.prueba16pf_estado === "invitada" &&
                        applicant.prueba16pf_expira_en &&
                        new Date(applicant.prueba16pf_expira_en).getTime() > Date.now()
                      ? "Invitada"
                      : applicant.prueba16pf_estado
                        ? "Enlace vencido"
                        : "Sin enviar"}
              </td>
              <td data-label="Acciones">
                <div className="applicant-actions">
                  <button
                    className="text-button"
                    disabled={
                      applicant.autorizacion_estado === "firmada" ||
                      sendingId === applicant.id
                    }
                    onClick={() => onSendAuthorization(applicant)}
                    type="button"
                  >
                    {sendingId === applicant.id
                      ? "Enviando..."
                      : applicant.autorizacion_estado
                        ? "Reenviar autorización"
                        : "Enviar autorización"}
                  </button>
                  <button
                    className="text-button"
                    disabled={
                      applicant.prueba16pf_estado === "completada" ||
                      sendingExamId === applicant.id
                    }
                    onClick={() => onSendExam(applicant)}
                    type="button"
                  >
                    {sendingExamId === applicant.id
                      ? "Enviando..."
                      : applicant.prueba16pf_estado
                        ? "Reenviar prueba 16PF"
                        : "Enviar prueba 16PF"}
                  </button>
                  {applicant.prueba16pf_estado === "completada" && (
                    <button
                        className="text-button"
                        disabled={reportBusy}
                        onClick={() => onGenerateReport(applicant)}
                        type="button"
                    >
                        {generatingReportId === applicant.id
                          ? "Cargando postulaciones..."
                          : "Generar guía 16PF"}
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => onEdit(applicant)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="text-button delete-button"
                    disabled={deletingId === applicant.id}
                    onClick={() => onDelete(applicant)}
                    type="button"
                  >
                    {deletingId === applicant.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportPostulationPanel({
  applicant,
  postulations,
  selectedPostulationId,
  loading,
  sending,
  onClose,
  onSelect,
  onSubmit,
}) {
  if (!applicant) return null;

  return (
    <div className="applicant-report-panel">
      <div className="applicant-form-heading">
        <h3>Guía exploratoria para {applicant.nombre} {applicant.apellido}</h3>
        <p className="muted">
          El informe es orientativo, no puntuado ni estandarizado, y no determina
          aptitud ni recomienda decisiones de contratación. Requiere revisión
          profesional.
        </p>
      </div>
      {loading ? (
        <p className="empty">Cargando postulaciones...</p>
      ) : (
        <form className="applicant-report-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Vacante de la postulación</span>
            <select
              onChange={(event) => onSelect(event.target.value)}
              required
              value={selectedPostulationId}
            >
              {postulations.map((postulation) => (
                <option
                  key={postulation.postulacion_id}
                  value={postulation.postulacion_id}
                >
                  {postulation.vacante_nombre} · {postulation.postulacion_estado}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Se consultarán las respuestas y requisitos de esta postulación. El
            análisis se procesa en Ollama local y se envía al correo configurado
            para RR. HH.; no se guarda una copia del informe.
          </p>
          <div className="form-actions">
            <button
              className="secondary"
              disabled={loading || sending}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary"
              disabled={sending || postulations.length === 0}
              type="submit"
            >
              {sending ? "Generando y enviando..." : "Generar y enviar guía"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Pagination({ pagination, onChange }) {
  if (pagination.paginas <= 1) return null;

  return (
    <div className="pagination">
      <span>
        Página {pagination.pagina} de {pagination.paginas}
        <span className="pagination-total"> · {pagination.total} aspirantes</span>
      </span>
      <div className="pagination-actions">
        <button
          className="secondary"
          disabled={pagination.pagina === 1}
          onClick={() => onChange(pagination.pagina - 1)}
          type="button"
        >
          Anterior
        </button>
        <button
          className="secondary"
          disabled={pagination.pagina === pagination.paginas}
          onClick={() => onChange(pagination.pagina + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  const [form, setForm] = useState(emptyApplicant);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [pagination, setPagination] = useState({
    pagina: 1,
    por_pagina: 15,
    total: 0,
    paginas: 0,
  });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [sendingExamId, setSendingExamId] = useState(null);
  const [reportApplicant, setReportApplicant] = useState(null);
  const [reportPostulations, setReportPostulations] = useState([]);
  const [selectedPostulationId, setSelectedPostulationId] = useState("");
  const [loadingReportPostulationsId, setLoadingReportPostulationsId] = useState(null);
  const [generatingReportId, setGeneratingReportId] = useState(null);

  const loadApplicants = async (requestedPage = page) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/aspirantes?pagina=${requestedPage}`);
      setApplicants(data.aspirantes);
      setPagination(data.paginacion);
      setPage(data.paginacion.pagina);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants(1);
  }, []);

  const resetForm = () => {
    setForm(emptyApplicant);
    setEditingId(null);
    setFormOpen(false);
  };

  const toggleCreateForm = () => {
    if (formOpen) {
      resetForm();
      setError("");
      return;
    }
    setForm(emptyApplicant);
    setEditingId(null);
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await apiRequest(
        editingId ? `/aspirantes/${editingId}` : "/aspirantes",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(form),
        },
      );
      resetForm();
      setMessage(editingId ? "Aspirante actualizado." : "Aspirante agregado.");
      await loadApplicants(editingId ? page : 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const editApplicant = (applicant) => {
    setEditingId(applicant.id);
    setFormOpen(true);
    setForm({
      nombre: applicant.nombre,
      apellido: applicant.apellido,
      numero_cedula: applicant.numero_cedula,
      numero_celular: applicant.numero_celular,
      correo: applicant.correo,
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeApplicant = async (applicant) => {
    if (!window.confirm(`¿Eliminar a ${applicant.nombre} ${applicant.apellido}?`)) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingId(applicant.id);
    try {
      await apiRequest(`/aspirantes/${applicant.id}`, { method: "DELETE" });
      setMessage("Aspirante eliminado.");
      const nextPage =
        applicants.length === 1 && page > 1 ? page - 1 : page;
      await loadApplicants(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  };

  const sendAuthorization = async (applicant) => {
    if (applicant.autorizacion_estado === "firmada") return;
    if (
      !window.confirm(
        `¿Enviar la autorización de tratamiento de datos a ${applicant.correo}?`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setSendingId(applicant.id);
    try {
      await apiRequest(`/aspirantes/${applicant.id}/tratamiento/enviar`, {
        method: "POST",
      });
      setMessage(`Autorización enviada a ${applicant.correo}. El enlace vence en 24 horas.`);
      await loadApplicants(page);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSendingId(null);
    }
  };

  const sendExam = async (applicant) => {
    if (applicant.prueba16pf_estado === "completada") return;
    const confirmation = applicant.prueba16pf_estado
      ? `¿Reenviar la invitación 16PF a ${applicant.correo}? Se conservarán las respuestas guardadas.`
      : `¿Enviar la invitación 16PF a ${applicant.correo}?`;
    if (!window.confirm(confirmation)) return;

    setError("");
    setMessage("");
    setSendingExamId(applicant.id);
    try {
      await apiRequest(`/aspirantes/${applicant.id}/prueba-16pf/enviar`, {
        method: "POST",
      });
      setMessage(`Invitación 16PF enviada a ${applicant.correo}. El enlace vence en 24 horas.`);
      await loadApplicants(page);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSendingExamId(null);
    }
  };

  const openReportPanel = async (applicant) => {
    if (loadingReportPostulationsId || generatingReportId) return;
    setError("");
    setMessage("");
    setReportApplicant(applicant);
    setReportPostulations([]);
    setSelectedPostulationId("");
    setLoadingReportPostulationsId(applicant.id);
    try {
      const data = await apiRequest(
        `/aspirantes/${applicant.id}/informe-16pf/postulaciones`,
      );
      if (data.postulaciones.length === 0) {
        setReportApplicant(null);
        setError("Este aspirante no tiene postulaciones asociadas.");
        return;
      }
      setReportPostulations(data.postulaciones);
      setSelectedPostulationId(String(data.postulaciones[0].postulacion_id));
    } catch (requestError) {
      setReportApplicant(null);
      setError(requestError.message);
    } finally {
      setLoadingReportPostulationsId(null);
    }
  };

  const closeReportPanel = () => {
    if (loadingReportPostulationsId || generatingReportId) return;
    setReportApplicant(null);
    setReportPostulations([]);
    setSelectedPostulationId("");
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportApplicant || !selectedPostulationId) return;
    if (
      !window.confirm(
        "Se consultarán las respuestas del aspirante y se enviará una guía exploratoria al correo configurado para RR. HH. ¿Continuar?",
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setGeneratingReportId(reportApplicant.id);
    try {
      const result = await apiRequest(
        `/aspirantes/${reportApplicant.id}/informe-16pf/postulaciones/${selectedPostulationId}/enviar`,
        { method: "POST" },
      );
      setMessage(result.message);
      setReportApplicant(null);
      setReportPostulations([]);
      setSelectedPostulationId("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGeneratingReportId(null);
    }
  };

  return (
    <div className="applicants-page">
      <FormMessage error={error} message={message} />
      <section className="panel">
        <div className="panel-heading applicants-heading">
          <div>
            <p className="eyebrow">BASE DE TALENTO</p>
            <h2>Aspirantes</h2>
          </div>
          <div className="applicants-heading-actions">
            <span className="count">{pagination.total}</span>
            <button className="primary" onClick={toggleCreateForm} type="button">
              {formOpen && !editingId ? "Cerrar formulario" : "Agregar aspirante"}
            </button>
          </div>
        </div>
        {formOpen && (
          <div className="applicant-form-panel">
            <div className="applicant-form-heading">
              <h3>{editingId ? "Editar aspirante" : "Nuevo aspirante"}</h3>
              <p className="muted">
                Registra los datos de contacto de una persona postulante.
              </p>
            </div>
            <form className="form-grid applicant-form" onSubmit={submit}>
              {fields.map(([name, label, type]) => (
                <Field key={name} label={label}>
                  <input
                    autoComplete={name === "correo" ? "email" : "off"}
                    maxLength={
                      name === "nombre" || name === "apellido"
                        ? 100
                        : name === "correo"
                          ? 254
                          : 30
                    }
                    required
                    type={type}
                    value={form[name]}
                    onChange={(event) =>
                      setForm({ ...form, [name]: event.target.value })
                    }
                  />
                </Field>
              ))}
              <div className="form-actions form-submit">
                <button
                  className="secondary"
                  onClick={resetForm}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary" disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Guardar cambios"
                      : "Agregar aspirante"}
                </button>
              </div>
            </form>
          </div>
        )}
        <ReportPostulationPanel
          applicant={reportApplicant}
          loading={loadingReportPostulationsId === reportApplicant?.id}
          onClose={closeReportPanel}
          onSelect={setSelectedPostulationId}
          onSubmit={submitReport}
          postulations={reportPostulations}
          selectedPostulationId={selectedPostulationId}
          sending={generatingReportId === reportApplicant?.id}
        />
        {loading ? (
          <p className="empty">Cargando aspirantes...</p>
        ) : (
          <>
            <ApplicantsTable
              applicants={applicants}
              deletingId={deletingId}
              onDelete={removeApplicant}
              onEdit={editApplicant}
              onSendAuthorization={sendAuthorization}
              onSendExam={sendExam}
              onGenerateReport={openReportPanel}
              sendingId={sendingId}
              sendingExamId={sendingExamId}
              reportBusy={Boolean(
                loadingReportPostulationsId || generatingReportId,
              )}
              generatingReportId={
                loadingReportPostulationsId || generatingReportId
              }
            />
            <Pagination pagination={pagination} onChange={loadApplicants} />
          </>
        )}
      </section>
    </div>
  );
}
