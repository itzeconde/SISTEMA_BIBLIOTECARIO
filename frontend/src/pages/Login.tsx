import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

interface FormLogin {
  matricula_id:     string;
  usuario_password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form,        setForm]        = useState<FormLogin>({ matricula_id: "", usuario_password: "" });
  const [error,       setError]       = useState("");
  const [cargando,    setCargando]    = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token",   data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        navigate(data.es_admin ? "/admin" : "/home");
      } else {
        setError("Matrícula o contraseña incorrectos.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel-img">
        <img
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80"
          alt="Biblioteca"
        />
        <div className="login-panel-overlay" />
        <button className="login-volver-btn" onClick={() => navigate("/")}>
          ← Volver al inicio
        </button>
        <div className="login-panel-texto">
          <div className="login-logo-wrap">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="login-panel-titulo">El conocimiento comienza aquí</h2>
          <p className="login-panel-sub">
            Accede a más títulos, solicita préstamos y aparta tus libros favoritos.
          </p>
        </div>
      </div>

      <div className="login-panel-form">
        <div className="login-form-wrap">
          <div className="login-logo-mobile">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>

          <h1 className="login-titulo">Iniciar sesión</h1>
          <p className="login-subtitulo">Ingresa con tu ID institucional y contraseña</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">ID Institucional</label>
              <input
                className="form-input"
                type="text"
                name="matricula_id"
                placeholder="Ej. 20242TIDSM059"
                value={form.matricula_id}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div className="login-label-row">
                <label className="form-label">Contraseña</label>
                <span
                  className="login-forgot-link"
                  onClick={() => navigate("/recuperar-password")}
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div className="login-input-wrap">
                <input
                  className="form-input"
                  type={verPassword ? "text" : "password"}
                  name="usuario_password"
                  placeholder="••••••••"
                  value={form.usuario_password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-pass"
                  onClick={() => setVerPassword(!verPassword)}
                  tabIndex={-1}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="btn-login" disabled={cargando}>
              {cargando ? "Verificando..." : "Entrar"}
            </button>
          </form>

          <div className="login-divider"><span>o</span></div>

          <p className="login-volver">
            ¿No tienes cuenta?{" "}
            <span className="login-link" onClick={() => navigate("/registro")}>
              Regístrate aquí
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}