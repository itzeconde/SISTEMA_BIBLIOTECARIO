// src/pages/admin/AdminUsuarios.tsx
import { useEffect, useState } from 'react';
import './AdminUsuarios.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const POR_PAGINA = 10;

interface Usuario {
  usuario_id:              number;
  usuario_nombre:          string;
  usuario_aPaterno:        string;
  usuario_aMaterno:        string;
  matricula_id:            string;
  usuario_email:           string;
  usuario_rol:             string;  // 'alumno' | 'docente'
  usuario_bloqueado_hasta: string | null;
  esta_bloqueado:          boolean;
  dias_bloqueo_restantes:  number;
}

interface FormCrear {
  usuario_nombre:   string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id:     string;
  usuario_email:    string;
  usuario_password: string;
}

interface FormEditar {
  usuario_nombre:   string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id:     string;
  usuario_email:    string;
}

const FORM_CREAR_VACIO: FormCrear = {
  usuario_nombre: '', usuario_aPaterno: '', usuario_aMaterno: '',
  matricula_id: '', usuario_email: '', usuario_password: '',
};

const FORM_EDITAR_VACIO: FormEditar = {
  usuario_nombre: '', usuario_aPaterno: '', usuario_aMaterno: '',
  matricula_id: '', usuario_email: '',
};

type Modal =
  | { tipo: 'crear' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'eliminar'; usuario: Usuario };

// ── Validaciones ─────────────────────────────────────────────
const soloLetras = (valor: string) =>
  /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(valor.trim());

const validarNombres = (nombre: string, aPaterno: string, aMaterno: string): string => {
  if (!nombre.trim())        return "El nombre es requerido.";
  if (!soloLetras(nombre))   return "El nombre solo puede contener letras y espacios.";
  if (!aPaterno.trim())      return "El apellido paterno es requerido.";
  if (!soloLetras(aPaterno)) return "El apellido paterno solo puede contener letras y espacios.";
  if (aMaterno && !soloLetras(aMaterno))
    return "El apellido materno solo puede contener letras y espacios.";
  return "";
};

const detectarRolTexto = (matricula: string): string => {
  if (/^\d{3}$/.test(matricula))           return 'docente';
  if (/^\d{4,5}[A-Z]+\d+$/.test(matricula)) return 'alumno';
  return '';
};
// ─────────────────────────────────────────────────────────────

export default function AdminUsuarios() {
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [pagina,     setPagina]     = useState(1);
  const [modal,      setModal]      = useState<Modal | null>(null);
  const [formCrear,  setFormCrear]  = useState<FormCrear>(FORM_CREAR_VACIO);
  const [formEditar, setFormEditar] = useState<FormEditar>(FORM_EDITAR_VACIO);
  const [msg,        setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [guardando,  setGuardando]  = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/usuarios/`, { headers });
      setUsuarios(await r.json());
    } catch { mostrar('err', 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => { setPagina(1); }, [busqueda]);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const abrirCrear = () => {
    setFormCrear(FORM_CREAR_VACIO);
    setErrorModal('');
    setModal({ tipo: 'crear' });
  };

  const abrirEditar = (u: Usuario) => {
    setFormEditar({
      usuario_nombre:   u.usuario_nombre,
      usuario_aPaterno: u.usuario_aPaterno,
      usuario_aMaterno: u.usuario_aMaterno,
      matricula_id:     u.matricula_id,
      usuario_email:    u.usuario_email,
    });
    setErrorModal('');
    setModal({ tipo: 'editar', usuario: u });
  };

  const handleGuardar = async () => {
    if (modal?.tipo === 'crear') {
      const err = validarNombres(
        formCrear.usuario_nombre,
        formCrear.usuario_aPaterno,
        formCrear.usuario_aMaterno
      );
      if (err) { setErrorModal(err); return; }
      if (formCrear.usuario_password.length < 6) {
        setErrorModal("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      const rolDetectado = detectarRolTexto(formCrear.matricula_id.toUpperCase());
      if (!rolDetectado) {
        setErrorModal("Formato de matrícula no válido. Alumno: 20242TIDSM059 | Docente: 059 (3 dígitos)");
        return;
      }
    }

    if (modal?.tipo === 'editar') {
      const err = validarNombres(
        formEditar.usuario_nombre,
        formEditar.usuario_aPaterno,
        formEditar.usuario_aMaterno
      );
      if (err) { setErrorModal(err); return; }
    }

    setGuardando(true);
    try {
      if (modal?.tipo === 'crear') {
        const r = await fetch(`${API}/admin/usuarios/`, {
          method: 'POST', headers, body: JSON.stringify(formCrear),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Usuario creado correctamente');
      } else if (modal?.tipo === 'editar') {
        const r = await fetch(`${API}/admin/usuarios/${modal.usuario.usuario_id}/`, {
          method: 'PUT', headers, body: JSON.stringify(formEditar),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Usuario actualizado correctamente');
      }
      setModal(null);
      setErrorModal('');
      cargar();
    } catch (e: any) { setErrorModal(e.message); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async () => {
    if (modal?.tipo !== 'eliminar') return;
    setGuardando(true);
    try {
      await fetch(`${API}/admin/usuarios/${modal.usuario.usuario_id}/`, { method: 'DELETE', headers });
      mostrar('ok', 'Usuario eliminado correctamente');
      setModal(null);
      // Si la página actual queda vacía tras eliminar, retroceder una página
      const nuevoTotal = usuarios.length - 1;
      const maxPagina = Math.max(1, Math.ceil(nuevoTotal / POR_PAGINA));
      if (pagina > maxPagina) setPagina(maxPagina);
      cargar();
    } catch { mostrar('err', 'Error al eliminar usuario'); }
    finally { setGuardando(false); }
  };

  // ── Filtrado y paginación ─────────────────────────────────
  const filtrados = usuarios.filter(u =>
    `${u.usuario_nombre} ${u.usuario_aPaterno} ${u.matricula_id} ${u.usuario_email}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio       = (paginaSegura - 1) * POR_PAGINA;
  const paginados    = filtrados.slice(inicio, inicio + POR_PAGINA);

  // Números de página visibles (máximo 5, centrados alrededor de la página actual)
  const generarPaginas = (): (number | '...')[] => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (paginaSegura > 3) pages.push('...');
    for (let i = Math.max(2, paginaSegura - 1); i <= Math.min(totalPaginas - 1, paginaSegura + 1); i++) {
      pages.push(i);
    }
    if (paginaSegura < totalPaginas - 2) pages.push('...');
    pages.push(totalPaginas);
    return pages;
  };
  // ─────────────────────────────────────────────────────────

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const rolDetectadoCrear = detectarRolTexto(formCrear.matricula_id.toUpperCase());

  return (
    <div className="ausu-page">
      <div className="ausu-header">
        <div>
          <h1 className="ausu-title">Usuarios</h1>
          <p className="ausu-sub">{usuarios.length} usuario(s) registrado(s)</p>
        </div>
        <button className="ausu-btn-nuevo" onClick={abrirCrear}>+ Nuevo usuario</button>
      </div>

      {msg && <div className={`ausu-notif ${msg.tipo}`}>{msg.texto}</div>}

      <div className="ausu-filtros">
        <input
          className="ausu-search"
          placeholder="Buscar por nombre, matrícula o correo…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <span className="ausu-count">{filtrados.length} resultado(s)</span>
      </div>

      {loading ? (
        <div className="ausu-loading"><div className="ausu-spinner" /><p>Cargando…</p></div>
      ) : filtrados.length === 0 ? (
        <div className="ausu-empty"><p>No se encontraron usuarios.</p></div>
      ) : (
        <>
          <div className="ausu-tabla-wrap">
            <table className="ausu-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Matrícula / N° Trabajador</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estatus</th>
                  <th>Bloqueado hasta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map(u => (
                  <tr key={u.usuario_id}>
                    <td className="td-nombre">
                      <div className="ausu-avatar">{u.usuario_nombre[0]}</div>
                      <div>
                        <div className="td-bold">
                          {u.usuario_nombre} {u.usuario_aPaterno} {u.usuario_aMaterno}
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{u.matricula_id}</td>
                    <td className="td-muted">{u.usuario_email}</td>
                    <td>
                      <span className={`ausu-pill rol-${u.usuario_rol}`}>
                        {u.usuario_rol === 'alumno' ? '🎓 Alumno' : '👨‍🏫 Docente'}
                      </span>
                    </td>
                    <td>
                      {u.esta_bloqueado
                        ? <span className="ausu-pill bloqueado">🔒 Bloqueado</span>
                        : <span className="ausu-pill activo">Activo</span>
                      }
                    </td>
                    <td className="td-muted">
                      {u.usuario_bloqueado_hasta ? fc(u.usuario_bloqueado_hasta) : '—'}
                    </td>
                    <td>
                      <div className="ausu-acciones">
                        <button className="ausu-btn-edit" onClick={() => abrirEditar(u)}>Editar</button>
                        <button className="ausu-btn-del" onClick={() => setModal({ tipo: 'eliminar', usuario: u })}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Paginación ── */}
          {totalPaginas > 1 && (
            <div className="ausu-paginacion">
              <span className="ausu-pag-info">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtrados.length)} de {filtrados.length}
              </span>

              <div className="ausu-pag-controles">
                <button
                  className="ausu-pag-btn"
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  aria-label="Página anterior"
                >
                  ‹
                </button>

                {generarPaginas().map((p, i) =>
                  p === '...'
                    ? <span key={`dots-${i}`} className="ausu-pag-dots">…</span>
                    : (
                      <button
                        key={p}
                        className={`ausu-pag-btn${paginaSegura === p ? ' ausu-pag-activa' : ''}`}
                        onClick={() => setPagina(p as number)}
                      >
                        {p}
                      </button>
                    )
                )}

                <button
                  className="ausu-pag-btn"
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal Crear ── */}
      {modal?.tipo === 'crear' && (
        <div className="ausu-backdrop" onClick={() => setModal(null)}>
          <div className="ausu-modal" onClick={e => e.stopPropagation()}>
            <button className="ausu-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="ausu-modal-title">Nuevo usuario</h2>
            <div className="ausu-form-grid">
              <div className="ausu-form-group">
                <label>Nombre(s)</label>
                <input value={formCrear.usuario_nombre}
                  onChange={e => { setFormCrear({...formCrear, usuario_nombre: e.target.value}); setErrorModal(''); }}
                  placeholder="Nombre" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Paterno</label>
                <input value={formCrear.usuario_aPaterno}
                  onChange={e => { setFormCrear({...formCrear, usuario_aPaterno: e.target.value}); setErrorModal(''); }}
                  placeholder="Apellido Paterno" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Materno</label>
                <input value={formCrear.usuario_aMaterno}
                  onChange={e => { setFormCrear({...formCrear, usuario_aMaterno: e.target.value}); setErrorModal(''); }}
                  placeholder="Apellido Materno (opcional)" />
              </div>
              <div className="ausu-form-group">
                <label>Matrícula / N° Trabajador</label>
                <input
                  value={formCrear.matricula_id}
                  onChange={e => { setFormCrear({...formCrear, matricula_id: e.target.value}); setErrorModal(''); }}
                  placeholder="Ej. 20242TIDSM059 o 059"
                />
                {formCrear.matricula_id && (
                  <span style={{ fontSize: 12, marginTop: 4, color: rolDetectadoCrear ? '#34d399' : '#f87171' }}>
                    {rolDetectadoCrear
                      ? `Rol detectado: ${rolDetectadoCrear === 'alumno' ? '🎓 Alumno' : '👨‍🏫 Docente'}`
                      : '⚠️ Formato no válido'}
                  </span>
                )}
              </div>
              <div className="ausu-form-group ausu-span2">
                <label>Correo electrónico</label>
                <input type="email" value={formCrear.usuario_email}
                  onChange={e => { setFormCrear({...formCrear, usuario_email: e.target.value}); setErrorModal(''); }}
                  placeholder="correo@ejemplo.com" />
              </div>
              <div className="ausu-form-group ausu-span2">
                <label>Contraseña inicial</label>
                <input type="password" value={formCrear.usuario_password}
                  onChange={e => { setFormCrear({...formCrear, usuario_password: e.target.value}); setErrorModal(''); }}
                  placeholder="••••••••" />
              </div>
            </div>
            {errorModal && <p className="ausu-modal-error">{errorModal}</p>}
            <div className="ausu-modal-btns">
              <button className="ausu-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Crear usuario'}
              </button>
              <button className="ausu-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar ── */}
      {modal?.tipo === 'editar' && (
        <div className="ausu-backdrop" onClick={() => setModal(null)}>
          <div className="ausu-modal" onClick={e => e.stopPropagation()}>
            <button className="ausu-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="ausu-modal-title">Editar usuario</h2>
            <p className="ausu-modal-nota">
              🔒 La contraseña no puede modificarse desde aquí. El rol se actualiza automáticamente si cambias la matrícula.
            </p>
            <div className="ausu-form-grid">
              <div className="ausu-form-group">
                <label>Nombre(s)</label>
                <input value={formEditar.usuario_nombre}
                  onChange={e => { setFormEditar({...formEditar, usuario_nombre: e.target.value}); setErrorModal(''); }}
                  placeholder="Nombre" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Paterno</label>
                <input value={formEditar.usuario_aPaterno}
                  onChange={e => { setFormEditar({...formEditar, usuario_aPaterno: e.target.value}); setErrorModal(''); }}
                  placeholder="Apellido Paterno" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Materno</label>
                <input value={formEditar.usuario_aMaterno}
                  onChange={e => { setFormEditar({...formEditar, usuario_aMaterno: e.target.value}); setErrorModal(''); }}
                  placeholder="Apellido Materno (opcional)" />
              </div>
              <div className="ausu-form-group">
                <label>Matrícula / N° Trabajador</label>
                <input value={formEditar.matricula_id}
                  onChange={e => { setFormEditar({...formEditar, matricula_id: e.target.value}); setErrorModal(''); }}
                  placeholder="Ej. 20242TIDSM059 o 059" />
              </div>
              <div className="ausu-form-group ausu-span2">
                <label>Correo electrónico</label>
                <input type="email" value={formEditar.usuario_email}
                  onChange={e => { setFormEditar({...formEditar, usuario_email: e.target.value}); setErrorModal(''); }}
                  placeholder="correo@ejemplo.com" />
              </div>
            </div>
            {errorModal && <p className="ausu-modal-error">{errorModal}</p>}
            <div className="ausu-modal-btns">
              <button className="ausu-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button className="ausu-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar ── */}
      {modal?.tipo === 'eliminar' && (
        <div className="ausu-backdrop" onClick={() => setModal(null)}>
          <div className="ausu-modal ausu-modal-sm" onClick={e => e.stopPropagation()}>
            <button className="ausu-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="ausu-del-ico">🗑️</div>
            <h2 className="ausu-modal-title">¿Eliminar usuario?</h2>
            <p className="ausu-del-txt">
              Se eliminará a <strong>{modal.usuario.usuario_nombre} {modal.usuario.usuario_aPaterno}</strong> permanentemente.
            </p>
            <div className="ausu-modal-btns">
              <button className="ausu-btn-del-confirm" onClick={handleEliminar} disabled={guardando}>
                {guardando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button className="ausu-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}