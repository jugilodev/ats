import { useEffect, useState } from "react";
import { apiRequest, apiUrl } from "../api.js";
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
  onViewPostulation,
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
            <th>Clasificación por vacante</th>
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
              <td data-label="Clasificación por vacante">
                {applicant.postulaciones?.length ? (
                  <div className="applicant-classifications">
                    {applicant.postulaciones.map((postulation) => {
                        const classification =
                          postulation.paso === true
                            ? "passed"
                            : postulation.paso === false
                              ? "failed"
                              : "pending";
                        const label =
                          classification === "passed"
                            ? "Clasificado"
                            : classification === "failed"
                              ? "No clasificado"
                              : "Pendiente";

                        return (
                          <div
                            className="applicant-classification"
                            key={postulation.postulacion_id}
                          >
                            <span
                              aria-label={label}
                              className={`classification-indicator ${classification}`}
                              role="img"
                            >
                              {classification === "passed"
                                ? "✓"
                                : classification === "failed"
                                  ? "×"
                                  : "·"}
                            </span>
                            <span className="classification-vacancy">
                              {postulation.vacante_nombre}
                            </span>
                            <span className={`classification-label ${classification}`}>
                              {label}
                            </span>
                            <button
                              className="text-button"
                              onClick={() =>
                                onViewPostulation(applicant, postulation)
                              }
                              type="button"
                            >
                              Ver detalle
                            </button>
                          </div>
                        );
                    })}
                  </div>
                ) : (
                  <span className="muted applicant-no-postulation">
                    Sin postulaciones
                  </span>
                )}
              </td>
              <td data-label="Acciones">
                <div className="applicant-actions">
                  {applicant.autorizacion_estado === "firmada" && (
                    <a
                      aria-label="Ver documento firmado de tratamiento de datos"
                      className="applicant-icon-button"
                      href={`${apiUrl}/aspirantes/${encodeURIComponent(applicant.id)}/tratamiento/pdf`}
                      rel="noopener noreferrer"
                      title="Ver documento firmado de tratamiento de datos"
                      target="_blank"
                    >
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path
                          d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
                          stroke="currentColor"
                          strokeLinejoin="round"
                          strokeWidth="1.7"
                        />
                        <path
                          d="M14 4v4h4M8 13h8m-8 3h8"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </a>
                  )}
                  {applicant.autorizacion_estado !== "firmada" && (
                    <button
                      aria-label={
                        applicant.autorizacion_estado
                          ? "Reenviar autorización por correo"
                          : "Enviar autorización por correo"
                      }
                      className="applicant-icon-button"
                      disabled={sendingId === applicant.id}
                      onClick={() => onSendAuthorization(applicant)}
                      title={
                        sendingId === applicant.id
                          ? "Enviando autorización..."
                          : applicant.autorizacion_estado
                            ? "Reenviar autorización por correo"
                            : "Enviar autorización por correo"
                      }
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path
                          d="M4 6.75h11.5A2.5 2.5 0 0 1 18 9.25v8A2.5 2.5 0 0 1 15.5 19.75h-9A2.5 2.5 0 0 1 4 17.25v-10.5Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.7"
                        />
                        <path
                          d="m5 7.5 6 5 5.2-4.35M15.5 4.25H20m0 0v4.5m0-4.5-5.25 5.25"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    aria-label={
                      applicant.prueba16pf_estado === "completada"
                        ? "Prueba 16PF completada"
                        : applicant.prueba16pf_estado
                          ? "Reenviar prueba 16PF por correo"
                          : "Enviar prueba 16PF por correo"
                    }
                    className="applicant-icon-button"
                    disabled={
                      applicant.prueba16pf_estado === "completada" ||
                      sendingExamId === applicant.id
                    }
                    onClick={() => onSendExam(applicant)}
                    title={
                      sendingExamId === applicant.id
                        ? "Enviando prueba 16PF..."
                        : applicant.prueba16pf_estado === "completada"
                          ? "Prueba 16PF completada"
                          : applicant.prueba16pf_estado
                            ? "Reenviar prueba 16PF por correo"
                            : "Enviar prueba 16PF por correo"
                    }
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="18"
                      viewBox="0 0 24 24"
                      width="18"
                    >
                      <path
                        d="M8 5.25h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                      <path
                        d="M9 5.25v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 10h6m-6 4h6m-6 4h3"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                      <path
                        d="m8.6 10 .8.8 1.4-1.6m-2.2 5.6.8.8 1.4-1.6m-2.2 5.6.8.8.9-1"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                  {applicant.prueba16pf_estado === "completada" && (
                    <button
                      aria-label="Generar guía exploratoria 16PF"
                      className="applicant-icon-button"
                      disabled={reportBusy}
                      onClick={() => onGenerateReport(applicant)}
                      title={
                        generatingReportId === applicant.id
                          ? "Cargando postulaciones para la guía 16PF..."
                          : "Generar guía exploratoria 16PF"
                      }
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="18"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path
                          d="M12 3.75v2.5m0 12v2m8.25-8.25h-2.5m-11.5 0h-2.5m14.1-5.85-1.75 1.75m-8.2 8.2-1.75 1.75m11.7 0-1.75-1.75m-8.2-8.2L5.9 6.15"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.7"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="4.25"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    aria-label={`Editar a ${applicant.nombre} ${applicant.apellido}`}
                    className="applicant-icon-button"
                    onClick={() => onEdit(applicant)}
                    title="Editar aspirante"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="18"
                      viewBox="0 0 24 24"
                      width="18"
                    >
                      <path
                        d="m14.25 5.25 4.5 4.5m-11.5 9.5 3.65-.75L20 9.4a2.12 2.12 0 0 0-3-3l-9.1 9.1-.65 3.75ZM5 20.25h14"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                    </svg>
                  </button>
                  <button
                    aria-label={`Eliminar a ${applicant.nombre} ${applicant.apellido}`}
                    className="applicant-icon-button danger"
                    disabled={deletingId === applicant.id}
                    onClick={() => onDelete(applicant)}
                    title={
                      deletingId === applicant.id
                        ? "Eliminando aspirante..."
                        : "Eliminar aspirante"
                    }
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="18"
                      viewBox="0 0 24 24"
                      width="18"
                    >
                      <path
                        d="m7 7 10 10M17 7 7 17"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.9"
                      />
                    </svg>
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

function PostulationDetailPanel({ detail, onClose }) {
  if (!detail) return null;

  const { applicant, postulation } = detail;
  const status =
    postulation.paso === true
      ? "Clasificado"
      : postulation.paso === false
        ? "No clasificado"
        : "Pendiente de clasificación";
  const classification =
    postulation.paso === true
      ? "passed"
      : postulation.paso === false
        ? "failed"
        : "pending";
  const cvUrl = `${apiUrl}/aspirantes/${encodeURIComponent(applicant.id)}/postulaciones/${encodeURIComponent(postulation.postulacion_id)}/cv`;

  return (
    <section
      aria-labelledby="postulation-detail-title"
      className="applicant-postulation-detail"
    >
      <div className="postulation-detail-heading">
        <div>
          <p className="eyebrow">DETALLE DE POSTULACIÓN</p>
          <h3 id="postulation-detail-title">
            {postulation.vacante_nombre}
          </h3>
          <p className="muted">
            {applicant.nombre} {applicant.apellido}
          </p>
        </div>
        <button className="secondary" onClick={onClose} type="button">
          Cerrar
        </button>
      </div>
      <dl className="postulation-detail-fields">
        <div>
          <dt>Clasificación</dt>
          <dd>
            <span className={`classification-label ${classification}`}>
              {status}
            </span>
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{postulation.estado || "Sin estado"}</dd>
        </div>
      </dl>
      <div className="postulation-description">
        <h4>Descripción / motivo</h4>
        <p>
          {postulation.descripcion?.trim() ||
            "No se ha registrado una descripción para esta postulación."}
        </p>
      </div>
      <div className="postulation-cv-action">
        <h4>Hoja de vida</h4>
        {postulation.tiene_cv ? (
          <a className="primary" href={cvUrl} rel="noreferrer" target="_blank">
            Ver hoja de vida (PDF)
          </a>
        ) : (
          <p className="muted">No hay una hoja de vida registrada para esta postulación.</p>
        )}
      </div>
    </section>
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
    por_pagina: 10,
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
  const [postulationDetail, setPostulationDetail] = useState(null);

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
      setPostulationDetail(null);
      await loadApplicants(editingId ? page : 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const editApplicant = (applicant) => {
    setPostulationDetail(null);
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
    setPostulationDetail(null);
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
    setPostulationDetail(null);
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
        <PostulationDetailPanel
          detail={postulationDetail}
          onClose={() => setPostulationDetail(null)}
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
              onViewPostulation={(applicant, postulation) =>
                setPostulationDetail({ applicant, postulation })
              }
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
