import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import FormMessage from "../components/FormMessage.jsx";

const loadExam = async (order) =>
  apiRequest(`/pruebas16pf/portal/estado${order ? `?orden=${order}` : ""}`);

function ApplicantLogin({ token, onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await apiRequest(
        `/pruebas16pf/invitaciones/${encodeURIComponent(token)}/ingresar`,
        {
          method: "POST",
          body: JSON.stringify({ usuario, contrasena }),
        },
      );
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="exam-login-card" onSubmit={submit}>
      <div className="exam-brand">16PF</div>
      <p className="eyebrow">PRUEBA DE PERSONALIDAD</p>
      <h1>Ingresa para continuar</h1>
      <p className="muted">
        Usa el número de cédula que recibiste en el correo, tanto como usuario
        como contraseña.
      </p>
      <label htmlFor="exam-user">Usuario (cédula)</label>
      <input
        id="exam-user"
        autoComplete="username"
        inputMode="numeric"
        maxLength={30}
        required
        value={usuario}
        onChange={(event) => setUsuario(event.target.value)}
      />
      <label htmlFor="exam-password">Contraseña (cédula)</label>
      <input
        id="exam-password"
        autoComplete="current-password"
        inputMode="numeric"
        maxLength={30}
        required
        type="password"
        value={contrasena}
        onChange={(event) => setContrasena(event.target.value)}
      />
      {error && <p className="message error">{error}</p>}
      <button className="primary" disabled={loading}>
        {loading ? "Validando..." : "Ingresar"}
      </button>
    </form>
  );
}

function ExamInstructions({ state, onStart, loading }) {
  return (
    <section className="exam-card">
      <p className="eyebrow">ANTES DE COMENZAR</p>
      <h1>Hola, {state.nombre}</h1>
      <p className="exam-instructions">{state.instrucciones}</p>
      <h2>Ejemplos de práctica</h2>
      <p className="muted">
        Estos ejemplos no forman parte de tus respuestas ni de la prueba.
      </p>
      <div className="exam-examples">
        {state.ejemplos.map((example, index) => (
          <article className="exam-example" key={example.pregunta}>
            <strong>Ejemplo {index + 1}. {example.pregunta}</strong>
            <span>A. {example.opcion_a}</span>
            <span>B. {example.opcion_b}</span>
            <span>C. {example.opcion_c}</span>
          </article>
        ))}
      </div>
      <p className="exam-notice">
        La prueba tiene {state.total || "varias"} preguntas. Solo tienes un
        intento; tus respuestas se guardan automáticamente y podrás continuar
        desde donde quedaste si se interrumpe la sesión.
      </p>
      <button className="primary" disabled={loading} onClick={onStart} type="button">
        {loading ? "Preparando prueba..." : "Iniciar prueba"}
      </button>
    </section>
  );
}

function ExamQuestion({
  state,
  onNavigate,
  onAnswer,
  onFinish,
  busy,
  saving,
  error,
}) {
  const question = state.pregunta;
  const questionNumber = Number(question.numero);
  const options = [
    ["A", question.opcion_a],
    ["B", question.opcion_b],
    ["C", question.opcion_c],
  ];

  return (
    <section className="exam-card">
      <div className="exam-progress-heading">
        <div>
          <p className="eyebrow">PRUEBA 16PF</p>
          <h1>Hola, {state.nombre}</h1>
        </div>
        <span className="exam-progress-count">
          {state.respondidas} de {state.total} respondidas
        </span>
      </div>
      <div
        aria-label={`Pregunta ${questionNumber} de ${state.total}`}
        aria-valuemax={state.total}
        aria-valuemin="0"
        aria-valuenow={state.respondidas}
        className="exam-progress"
        role="progressbar"
      >
        <span style={{ width: `${(state.respondidas / state.total) * 100}%` }} />
      </div>
      <p className="exam-question-number">Pregunta {questionNumber}</p>
      <h2 className="exam-question">{question.pregunta}</h2>
      <div className="exam-options">
        {options.map(([letter, text]) => (
          <button
            aria-pressed={question.opcion_elegida === letter}
            className={`exam-option${question.opcion_elegida === letter ? " selected" : ""}`}
            disabled={busy}
            key={letter}
            onClick={() => onAnswer(letter)}
            type="button"
          >
            <span className="exam-option-letter">{letter}</span>
            <span>{text}</span>
          </button>
        ))}
      </div>
      <FormMessage error={error} />
      {saving && <p className="exam-save-status" role="status">Guardando respuesta...</p>}
      <div className="exam-navigation">
        <button
          className="secondary"
          disabled={busy || questionNumber <= 1}
          onClick={() => onNavigate(questionNumber - 1)}
          type="button"
        >
          Anterior
        </button>
        {questionNumber < state.total ? (
          <button
            className="primary"
            disabled={busy || !question.opcion_elegida}
            onClick={() => onNavigate(questionNumber + 1)}
            type="button"
          >
            Siguiente
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy || state.respondidas !== state.total}
            onClick={onFinish}
            type="button"
          >
            Finalizar prueba
          </button>
        )}
      </div>
    </section>
  );
}

export default function ExamPage({ token }) {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const refresh = async (order) => {
    const nextState = await loadExam(order);
    setState(nextState);
    return nextState;
  };

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let active = true;
    loadExam()
      .then((exam) => {
        if (active) setState(exam);
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
  }, [session]);

  const login = (data) => {
    setError("");
    setSession(data);
    setLoading(true);
  };

  const start = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("/pruebas16pf/portal/iniciar", { method: "POST" });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const navigate = async (order) => {
    setError("");
    setLoading(true);
    try {
      await refresh(order);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const answer = async (option) => {
    setError("");
    setSaving(true);
    try {
      await apiRequest("/pruebas16pf/portal/respuestas", {
        method: "PUT",
        body: JSON.stringify({
          pregunta_id: state.pregunta.id,
          numero: state.pregunta.numero,
          opcion_elegida: option,
        }),
      });
      await refresh(state.pregunta.numero);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!window.confirm("¿Confirmas que deseas finalizar la prueba? Ya no podrás cambiar tus respuestas.")) {
      return;
    }
    setError("");
    setSaving(true);
    try {
      await apiRequest("/pruebas16pf/portal/finalizar", { method: "POST" });
      setFinished(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <main className="exam-page">
        <ApplicantLogin token={token} onLogin={login} />
      </main>
    );
  }

  if (loading && !state) {
    return <main className="exam-page"><p className="exam-loading">Cargando la prueba...</p></main>;
  }

  if (error && !state) {
    return (
      <main className="exam-page">
        <section className="exam-card">
          <FormMessage error={error} />
          <p>Vuelve a ingresar desde el enlace de invitación para continuar.</p>
        </section>
      </main>
    );
  }

  if (finished || state?.estado === "completada") {
    return (
      <main className="exam-page">
        <section className="exam-card exam-finished">
          <div className="exam-finished-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">PRUEBA COMPLETADA</p>
          <h1>Finalizaste exitosamente</h1>
          <p className="muted">
            Tus respuestas quedaron registradas. Gracias por completar la prueba.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="exam-page">
      <div className="exam-shell">
        {state?.estado === "invitada" ? (
          <ExamInstructions state={state} onStart={start} loading={loading} />
        ) : state?.pregunta ? (
          <ExamQuestion
            error={error}
            onAnswer={answer}
            onFinish={finish}
            onNavigate={navigate}
            busy={loading || saving}
            saving={saving}
            state={state}
          />
        ) : (
          <section className="exam-card">
            <FormMessage error={error || "No se encontró la siguiente pregunta."} />
          </section>
        )}
      </div>
    </main>
  );
}
