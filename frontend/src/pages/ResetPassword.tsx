import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Login.css";

export default function ResetPassword() {
  const navigate   = useNavigate();
  const { token }  = useParams<{ token: string }>();

  const [nueva,      setNueva]      = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [exito,      setExito]      = useState(false);
  const [error,      setError]      = useState("");
  const [cargando,   setCargando]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) { setError("Las contraseñas no coinciden."); return; }
    if (nueva.length < 6)    { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setCargando(true);
    setError("");
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/reset-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nueva_password: nueva }),
        }
      );
      const data = await r.json();
      if (r.ok) {
        setExito(true);
      } else {
        setError(data.error || "Error al restablecer la contraseña.");
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
        <div className="login-panel-texto">
          <div className="login-logo-wrap">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="login-panel-titulo">Nueva contraseña</h2>
          <p className="login-panel-sub">Elige una contraseña segura para tu cuenta.</p>
        </div>
      </div>

      <div className="login-panel-form">
        <div className="login-form-wrap">
          <div className="login-logo-mobile">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>

          {!exito ? (
            <>
              <h1 className="login-titulo">Restablecer contraseña</h1>
              <p className="login-subtitulo">Escribe tu nueva contraseña dos veces para confirmar.</p>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={nueva}
                    onChange={e => { setNueva(e.target.value); setError(""); }}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    value={confirmar}
                    onChange={e => { setConfirmar(e.target.value); setError(""); }}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="btn-login" disabled={cargando}>
                  {cargando ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>
            </>
          ) : (
            <div className="recuperar-exito">
              <div className="recuperar-icono">✅</div>
              <h1 className="login-titulo">¡Contraseña actualizada!</h1>
              <p className="login-subtitulo" style={{ marginBottom: 24 }}>
                Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión.
              </p>
              <button className="btn-login" onClick={() => navigate("/login")}>
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}