import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // reutiliza los estilos del login

export default function RecuperarPassword() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [enviado,  setEnviado]  = useState(false);
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/recuperar-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_email: email }),
        }
      );
      // Siempre mostramos éxito (el backend no revela si el email existe)
      setEnviado(true);
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
        <button className="login-volver-btn" onClick={() => navigate("/login")}>
          ← Volver al login
        </button>
        <div className="login-panel-texto">
          <div className="login-logo-wrap">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="login-panel-titulo">Recupera tu acceso</h2>
          <p className="login-panel-sub">
            Te enviaremos un enlace seguro para restablecer tu contraseña.
          </p>
        </div>
      </div>

      <div className="login-panel-form">
        <div className="login-form-wrap">
          <div className="login-logo-mobile">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>

          {!enviado ? (
            <>
              <h1 className="login-titulo">¿Olvidaste tu contraseña?</h1>
              <p className="login-subtitulo">
                Ingresa el correo con el que te registraste y te enviaremos un enlace.
              </p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    required
                    autoComplete="email"
                  />
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="btn-login" disabled={cargando}>
                  {cargando ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>

              <div className="login-divider"><span>o</span></div>
              <p className="login-volver">
                <span className="login-link" onClick={() => navigate("/login")}>
                  Volver al inicio de sesión
                </span>
              </p>
            </>
          ) : (
            <div className="recuperar-exito">
              <div className="recuperar-icono">✉️</div>
              <h1 className="login-titulo">Revisa tu correo</h1>
              <p className="login-subtitulo" style={{ marginBottom: 24 }}>
                Si <strong>{email}</strong> está registrado, recibirás un enlace
                para restablecer tu contraseña. El enlace es válido por <strong>1 hora</strong>.
              </p>
              <button className="btn-login" onClick={() => navigate("/login")}>
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}