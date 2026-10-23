import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api.js";
import FormMessage from "../components/FormMessage.jsx";

function SignaturePad({ canvasRef, onSigned }) {
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#173d2f";
  }, [canvasRef]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(event);
  };

  const draw = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const context = canvasRef.current.getContext("2d");
    const nextPoint = getPoint(event);
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    onSigned(true);
    lastPoint.current = nextPoint;
  };

  const stopDrawing = (event) => {
    drawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onSigned(false);
  };

  return (
    <div className="consent-signature">
      <canvas
        aria-label="Recuadro para firmar con el dedo o el mouse"
        className="consent-signature-canvas"
        height="240"
        onPointerCancel={stopDrawing}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        ref={canvasRef}
        width="760"
      />
      <div className="consent-signature-footer">
        <span>Firma aquí con el dedo o el mouse</span>
        <button className="text-button" onClick={clear} type="button">
          Borrar firma
        </button>
      </div>
    </div>
  );
}

function formatExpiry(value) {
  return new Date(value).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function ConsentPage({ token }) {
  const canvasRef = useRef(null);
  const [authorization, setAuthorization] = useState(null);
  const [cedula, setCedula] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/consentimiento-datos/${encodeURIComponent(token)}`)
      .then((data) => {
        if (active) setAuthorization(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest(
        `/consentimiento-datos/${encodeURIComponent(token)}/firmar`,
        {
          method: "POST",
          body: JSON.stringify({
            acepto: accepted,
            cedula,
            firma: canvasRef.current.toDataURL("image/png"),
          }),
        },
      );
      setCompleted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="consent-page">
      <section className="consent-card">
        <a className="brand consent-brand" href="/">
          <span className="brand-icon">A</span>ATS<span className="brand-dot">.</span>
        </a>
        {loading ? (
          <p className="empty">Cargando autorización...</p>
        ) : completed ? (
          <div className="consent-complete">
            <span className="consent-checkmark" aria-hidden="true">✓</span>
            <p className="eyebrow">AUTORIZACIÓN REGISTRADA</p>
            <h1>Gracias por tu respuesta</h1>
            <p>Tu aceptación y firma quedaron registradas correctamente.</p>
          </div>
        ) : authorization ? (
          <>
            <p className="eyebrow">TRATAMIENTO DE DATOS PERSONALES</p>
            <h1>Lee y firma la autorización</h1>
            <p className="consent-greeting">
              Hola, {authorization.aspirante.nombre}{" "}
              {authorization.aspirante.apellido}. Revisa el documento antes de
              aceptar.
            </p>
            <article className="consent-document">
              <p className="consent-document-version">
                Versión {authorization.version}
              </p>
              <div className="consent-document-text">{authorization.texto}</div>
            </article>
            <p className="consent-expiry">
              Este enlace vence el {formatExpiry(authorization.expira_en)}.
            </p>
            <form className="consent-form" onSubmit={submit}>
              <label className="consent-checkbox">
                <input
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  He leído y acepto el tratamiento de mis datos personales en
                  los términos descritos anteriormente.
                </span>
              </label>
              <label className="field consent-id-field">
                <span className="field-label">Confirma tu número de cédula</span>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  required
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value)}
                />
              </label>
              <div className="field">
                <span className="field-label">Firma</span>
                <SignaturePad
                  canvasRef={canvasRef}
                  onSigned={setHasSignature}
                />
              </div>
              <FormMessage error={error} />
              <button
                className="primary consent-submit"
                disabled={!accepted || !cedula.trim() || !hasSignature || submitting}
              >
                {submitting ? "Guardando autorización..." : "Aceptar y firmar"}
              </button>
            </form>
          </>
        ) : (
          <div className="consent-error">
            <p className="eyebrow">ENLACE NO DISPONIBLE</p>
            <h1>No pudimos abrir la autorización</h1>
            <FormMessage error={error || "Verifica el enlace o solicita uno nuevo."} />
          </div>
        )}
        <p className="consent-legal-note">
          La firma dibujada registra tu aceptación en este sistema y no es una
          firma digital certificada.
        </p>
      </section>
    </main>
  );
}
