import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registro.css";

interface FormRegistro {
  usuario_nombre:   string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id:     string;
  usuario_email:    string;
  usuario_password: string;
}

const detectarTipo = (valor: string): "alumno" | "maestro" | null => {
  if (/^\d{1,3}$/.test(valor) && valor.length <= 3) return "maestro";
  if (/^\d{4,5}[A-Z]+\d+$/.test(valor)) return "alumno";
  return null;
};

const soloLetras = (valor: string) =>
  /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(valor.trim());

const validarForm = (form: FormRegistro): string => {
  if (!soloLetras(form.usuario_nombre))
    return "El nombre solo puede contener letras y espacios.";
  if (!soloLetras(form.usuario_aPaterno))
    return "El apellido paterno solo puede contener letras y espacios.";
  if (form.usuario_aMaterno && !soloLetras(form.usuario_aMaterno))
    return "El apellido materno solo puede contener letras y espacios.";
  if (form.usuario_password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  return "";
};

// Ícono ojo abierto
const IconoOjo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Ícono ojo tachado
const IconoOjoOculto = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormRegistro>({
    usuario_nombre:   "",
    usuario_aPaterno: "",
    usuario_aMaterno: "",
    matricula_id:     "",
    usuario_email:    "",
    usuario_password: "",
  });
  const [error,          setError]          = useState("");
  const [cargando,       setCargando]       = useState(false);
  const [verPassword,    setVerPassword]    = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [modalTerminos,  setModalTerminos]  = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const mensajeError = validarForm(form);
    if (mensajeError) { setError(mensajeError); return; }

    const tipo = detectarTipo(form.matricula_id);
    if (!tipo) {
      setError("El ID no tiene un formato válido. Matrícula: ej. 2024TIDSM020 | Núm. Trabajador: ej. 620");
      return;
    }

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    setCargando(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/registro/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, rol: tipo }),
        }
      );
      if (response.ok) {
        navigate("/login");
      } else {
        const data = await response.json();
        const primerError = Object.values(data)[0];
        setError(Array.isArray(primerError) ? (primerError[0] as string) : "Error al registrar.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const renderHintID = () => {
    if (!form.matricula_id) return null;
    const tipo = detectarTipo(form.matricula_id);
    if (tipo === "alumno")  return <span className="id-hint id-hint--alumno">✓ Matrícula de alumno</span>;
    if (tipo === "maestro") return <span className="id-hint id-hint--maestro">✓ Núm. de trabajador</span>;
    return <span className="id-hint id-hint--invalido">Formato no reconocido</span>;
  };

  return (
    <div className="registro-page">
      <div className="registro-panel-img">
        <img
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80"
          alt="Biblioteca"
        />
        <div className="registro-panel-overlay" />
        <button className="registro-volver-btn" onClick={() => navigate("/")}>
          ← Volver al inicio
        </button>
        <div className="registro-panel-texto">
          <div className="registro-logo-wrap">
            <div className="registro-logo-icon">B</div>
            <span className="registro-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="registro-panel-titulo">Únete a nuestra comunidad</h2>
          <p className="registro-panel-sub">
            Crea tu cuenta y accede a títulos, préstamos y apartados en línea.
          </p>
        </div>
      </div>

      <div className="registro-panel-form">
        <div className="registro-form-wrap">
          <div className="registro-logo-mobile">
            <div className="registro-logo-icon">B</div>
            <span className="registro-logo-text">Biblioteca Web</span>
          </div>

          <h1 className="registro-titulo">Crear cuenta</h1>
          <p className="registro-subtitulo">Llena los datos para registrarte</p>

          <form onSubmit={handleSubmit} className="registro-form">

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre(s)</label>
                <input className="form-input" type="text" name="usuario_nombre"
                  placeholder="Ej. Juan" value={form.usuario_nombre}
                  onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno</label>
                <input className="form-input" type="text" name="usuario_aPaterno"
                  placeholder="Ej. Pérez" value={form.usuario_aPaterno}
                  onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-input" type="text" name="usuario_aMaterno"
                  placeholder="Ej. García" value={form.usuario_aMaterno}
                  onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Matrícula / Núm. Trabajador</label>
                <input
                  className={`form-input ${
                    form.matricula_id
                      ? detectarTipo(form.matricula_id) === "alumno"  ? "form-input--alumno"
                        : detectarTipo(form.matricula_id) === "maestro" ? "form-input--maestro"
                        : "form-input--invalido"
                      : ""
                  }`}
                  type="text" name="matricula_id"
                  placeholder="Ej. 2024TIDSM020 o 620"
                  value={form.matricula_id} onChange={handleChange} required
                />
                {renderHintID()}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input className="form-input" type="email" name="usuario_email"
                placeholder="correo@ejemplo.com" value={form.usuario_email}
                onChange={handleChange} required autoComplete="email" />
              <span className="form-hint">Lo usarás para recuperar tu contraseña</span>
            </div>

            {/* Contraseña con toggle SVG igual al Login */}
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-password-wrap">
                <input
                  className="form-input"
                  type={verPassword ? "text" : "password"}
                  name="usuario_password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.usuario_password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn-ver-password"
                  onClick={() => setVerPassword(!verPassword)}
                  tabIndex={-1}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? <IconoOjoOculto /> : <IconoOjo />}
                </button>
              </div>
            </div>

            {/* Términos y condiciones */}
            <div className="terminos-wrap">
              <input
                type="checkbox"
                id="terminos"
                checked={aceptaTerminos}
                onChange={e => { setAceptaTerminos(e.target.checked); setError(""); }}
              />
              <label htmlFor="terminos" className="terminos-label">
                He leído y acepto los{" "}
                <span className="terminos-link" onClick={e => { e.preventDefault(); setModalTerminos(true); }}>
                  términos y condiciones
                </span>
              </label>
            </div>

            {error && <p className="registro-error">{error}</p>}

            <button type="submit" className="btn-registro" disabled={cargando || !aceptaTerminos}>
              {cargando ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          <div className="registro-divider"><span>o</span></div>

          <p className="registro-volver">
            ¿Ya tienes cuenta?{" "}
            <span className="registro-link" onClick={() => navigate("/login")}>Inicia sesión</span>
          </p>
        </div>
      </div>

      {/* Modal Términos y Condiciones */}
      {modalTerminos && (
        <div className="terminos-backdrop" onClick={() => setModalTerminos(false)}>
          <div className="terminos-modal" onClick={e => e.stopPropagation()}>
            <div className="terminos-modal-header">
              <h2>Términos y Condiciones</h2>
              <button className="terminos-modal-close" onClick={() => setModalTerminos(false)}>✕</button>
            </div>
            <div className="terminos-modal-body">
              <h3>1. Uso del sistema</h3>
              <p>El sistema de biblioteca es de uso exclusivo para alumnos y personal activo de la institución. El acceso es personal e intransferible.</p>
              <h3>2. Préstamos</h3>
              <p>Cada usuario puede tener hasta 3 préstamos activos simultáneamente. Los plazos disponibles son de 3, 5 o 7 días hábiles según lo seleccionado al momento del préstamo.</p>
              <h3>3. Devoluciones</h3>
              <p>Los libros deben devolverse en la fecha acordada. El retraso en la devolución generará un bloqueo temporal de la cuenta equivalente a los días de retraso.</p>
              <h3>4. Apartados</h3>
              <p>Es posible apartar hasta 3 libros simultáneamente. Un apartado asignado debe recogerse dentro del plazo establecido, de lo contrario será cancelado automáticamente.</p>
              <h3>5. Responsabilidad</h3>
              <p>El usuario es responsable del buen estado de los libros prestados. Cualquier daño o pérdida deberá ser reportado de inmediato al personal de la biblioteca.</p>
              <h3>6. Privacidad</h3>
              <p>Los datos personales proporcionados durante el registro serán utilizados únicamente para la gestión de préstamos y comunicaciones relacionadas con el servicio de biblioteca.</p>
              <h3>7. Correo electrónico</h3>
              <p>El correo registrado será utilizado exclusivamente para el envío de notificaciones del sistema, como la recuperación de contraseña. No será compartido con terceros.</p>
            </div>
            <div className="terminos-modal-footer">
              <button className="btn-aceptar-terminos"
                onClick={() => { setAceptaTerminos(true); setModalTerminos(false); }}>
                Aceptar términos
              </button>
              <button className="btn-cerrar-terminos" onClick={() => setModalTerminos(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}