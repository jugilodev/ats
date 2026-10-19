import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";
import Field from "./components/Field.jsx";
import FormMessage from "./components/FormMessage.jsx";
import ApplicantsPage from "./pages/ApplicantsPage.jsx";
import AgendaPage from "./pages/AgendaPage.jsx";
import VacancyPage from "./pages/VacancyPage.jsx";

const emptyUser = {
  nombre: "",
  apellido: "",
  numero_celular: "",
  numero_cedula: "",
  correo: "",
  contrasena: "",
  rol: "reclutador",
};

const emptyRequirement = { nombre: "", descripcion: "" };

function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { usuario } = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ correo, contrasena }),
      });
      onLogin(usuario);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">A</div>
        <p className="eyebrow">GESTIÓN DE TALENTO</p>
        <h1>Iniciar sesión</h1>
        <p className="muted">Ingresa a tu espacio de trabajo ATS.</p>
        <label htmlFor="login-email">Correo electrónico</label>
        <input id="login-email" autoComplete="username" type="email" required value={correo} onChange={(event) => setCorreo(event.target.value)} />
        <label htmlFor="login-password">Contraseña</label>
        <input id="login-password" autoComplete="current-password" type="password" required value={contrasena} onChange={(event) => setContrasena(event.target.value)} />
        {error && <p className="message error">{error}</p>}
        <button className="primary" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
      </form>
    </main>
  );
}

function UserForm() {
  const [form, setForm] = useState(emptyUser);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(emptyUser);
      setMessage("Usuario creado correctamente.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Crear usuario</h2></div></div>
      <p className="muted">Agrega una persona al equipo y asígnale un rol.</p>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Nombre"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field label="Apellido"><input required value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} /></Field>
        <Field label="Celular"><input required type="tel" value={form.numero_celular} onChange={(e) => setForm({ ...form, numero_celular: e.target.value })} /></Field>
        <Field label="Cédula"><input required value={form.numero_cedula} onChange={(e) => setForm({ ...form, numero_cedula: e.target.value })} /></Field>
        <Field label="Correo"><input required type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Field>
        <Field label="Contraseña"><input required type="password" minLength={8} value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} /></Field>
        <Field label="Rol">
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="reclutador">Reclutador</option>
            <option value="admin">Administrador</option>
          </select>
        </Field>
        <FormMessage error={error} message={message} />
        <button className="primary form-submit" disabled={loading}>{loading ? "Guardando..." : "Crear usuario"}</button>
      </form>
    </section>
  );
}

function RequirementPage() {
  const [form, setForm] = useState(emptyRequirement);
  const [requirements, setRequirements] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await apiRequest("/requisitos");
      setRequirements(data.requisitos);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/requisitos", { method: "POST", body: JSON.stringify(form) });
      setForm(emptyRequirement);
      setMessage("Requisito creado.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeRequirement = async (requirement) => {
    if (!window.confirm(`¿Borrar el requisito "${requirement.nombre}"?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(`/requisitos/${requirement.id}`, { method: "DELETE" });
      setMessage("Requisito eliminado.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">CATÁLOGO</p><h2>Crear requisito</h2></div></div>
        <p className="muted">Define criterios reutilizables y su descripción.</p>
        <form className="stack-form" onSubmit={submit}>
          <Field label="Nombre"><input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Descripción"><textarea rows="4" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Field>
          <FormMessage error={error} message={message} />
          <button className="primary">Guardar requisito</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">LISTADO</p><h2>Requisitos</h2></div><span className="count">{requirements.length}</span></div>
        {error && <p className="message error">{error}</p>}
        {requirements.length === 0 ? <p className="empty">Aún no hay requisitos.</p> : (
          <ul className="item-list">{requirements.map((item) => <li key={item.id}><div className="item-header"><strong>{item.nombre}</strong><button className="text-button delete-button" onClick={() => removeRequirement(item)} type="button">Borrar</button></div><span>{item.descripcion || "Sin descripción"}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}

const navigation = [
  { id: "agenda", title: "Agenda", icon: "A" },
  { id: "applicants", title: "Aspirantes", icon: "P" },
  { id: "vacancies", title: "Vacantes", icon: "V" },
  { id: "requirements", title: "Requisitos", icon: "R" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("vacancies");
  const [error, setError] = useState("");
  const pageTitles = {
    agenda: "Agenda",
    applicants: "Aspirantes",
    vacancies: "Vacantes",
    requirements: "Requisitos",
    users: "Usuarios",
  };

  useEffect(() => {
    apiRequest("/auth/me")
      .then(({ usuario }) => setUser(usuario))
      .catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setUser(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-icon">A</span>ATS<span className="brand-dot">.</span></a>
        <p className="nav-label">MENÚ PRINCIPAL</p>
        <nav>
          {navigation.map((item) => <button className={`nav-item ${page === item.id ? "selected" : ""}`} key={item.id} onClick={() => { setPage(item.id); setError(""); }}><span className="nav-icon">{item.icon}</span>{item.title}</button>)}
          {user.rol === "admin" && <button className={`nav-item ${page === "users" ? "selected" : ""}`} onClick={() => { setPage("users"); setError(""); }}><span className="nav-icon">U</span>Usuarios</button>}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{user.nombre?.charAt(0) || "U"}</span>
          <span className="profile-name"><strong>{user.nombre} {user.apellido}</strong><small>{user.rol}</small></span>
          <button className="logout-icon" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">↗</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="mobile-header"><span className="brand-icon">A</span><strong>ATS</strong><button onClick={logout}>Salir</button></header>
        <div className="content-heading"><div><p className="eyebrow">ATS / {pageTitles[page]?.toUpperCase()}</p><h1>{pageTitles[page]}</h1></div></div>
        {error && <p className="message error">{error}</p>}
        {page === "agenda" && <AgendaPage />}
        {page === "applicants" && <ApplicantsPage />}
        {page === "vacancies" && <VacancyPage />}
        {page === "requirements" && <RequirementPage />}
        {page === "users" && user.rol === "admin" && <UserForm />}
      </main>
    </div>
  );
}
