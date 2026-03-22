import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id: string;
  usuario_rol: string;
}

const NAV_ITEMS = [
  { path: '/admin',           icon: '▦',  label: 'Panel'      },
  { path: '/admin/usuarios',  icon: '👥', label: 'Usuarios'   },
  { path: '/admin/libros',    icon: '📚', label: 'Libros'     },
  { path: '/admin/prestamos', icon: '📖', label: 'Préstamos'  },
  { path: '/admin/apartados', icon: '🔖', label: 'Apartados'  },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const usuario: Usuario | null = JSON.parse(localStorage.getItem('usuario') || 'null');

  const [modalPerfil, setModalPerfil] = useState(false);
  const [tabPerfil,   setTabPerfil]   = useState<'info' | 'password'>('info');
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' });
  const [pwdMsg, setPwdMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const abrirPerfil = () => {
    setTabPerfil('info');
    setPwd({ actual: '', nueva: '', confirmar: '' });
    setPwdMsg(null);
    setModalPerfil(true);
  };

  const handleCambiarPassword = async () => {
    if (!pwd.nueva || !pwd.confirmar) {
      setPwdMsg({ tipo: 'err', texto: 'Completa todos los campos.' });
      return;
    }
    if (pwd.nueva !== pwd.confirmar) {
      setPwdMsg({ tipo: 'err', texto: 'Las contraseñas no coinciden.' });
      return;
    }
    if (pwd.nueva.length < 6) {
      setPwdMsg({ tipo: 'err', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(`${API}/admin/usuarios/${usuario?.usuario_id}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ usuario_password: pwd.nueva }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(Object.values(d)[0] as string);
      }
      setPwdMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' });
      setPwd({ actual: '', nueva: '', confirmar: '' });
    } catch (e: any) {
      setPwdMsg({ tipo: 'err', texto: e.message || 'Error al actualizar contraseña.' });
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const activo = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

  const iniciales = usuario
    ? `${usuario.usuario_nombre[0]}${usuario.usuario_aPaterno?.[0] ?? ''}`.toUpperCase()
    : '?';

  const nombreCompleto = usuario
    ? `${usuario.usuario_nombre} ${usuario.usuario_aPaterno} ${usuario.usuario_aMaterno ?? ''}`.trim()
    : '';

  return (
    <div className={`admin-layout ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Sidebar (solo desktop/tablet) ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-logo" onClick={() => navigate('/admin')}>
            <div className="admin-logo-icon">B</div>
            <span className="admin-logo-text">Biblioteca</span>
          </div>
          <button className="admin-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className="admin-sidebar-label">PANEL ADMIN</div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`admin-nav-item ${activo(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
              {activo(item.path) && <span className="admin-nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {usuario && (
            <button className="admin-user-info admin-user-btn" onClick={abrirPerfil} title="Ver perfil">
              <div className="admin-user-avatar">{iniciales}</div>
              <div className="admin-user-details">
                <span className="admin-user-name">{usuario.usuario_nombre}</span>
                <span className="admin-user-role">Administrador</span>
              </div>
              <span className="admin-user-chevron">›</span>
            </button>
          )}
          <button className="admin-logout-btn" onClick={cerrarSesion} title="Cerrar sesión">
            <span>⏻</span>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* ── Nav móvil via Portal — se renderiza directo en document.body ── */}
      {createPortal(
        <nav className="admin-mobile-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`admin-mobile-nav-item ${activo(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="admin-mobile-nav-icon">{item.icon}</span>
              <span className="admin-mobile-nav-label">{item.label}</span>
            </button>
          ))}
          <button
            className="admin-mobile-nav-item admin-mobile-nav-logout"
            onClick={cerrarSesion}
          >
            <span className="admin-mobile-nav-icon">⏻</span>
            <span className="admin-mobile-nav-label">Salir</span>
          </button>
        </nav>,
        document.body
      )}

      {/* ── Contenido ── */}
      <main className="admin-main">
        <Outlet />
      </main>

      {/* ── Modal Perfil ── */}
      {modalPerfil && (
        <div className="perfil-backdrop" onClick={() => setModalPerfil(false)}>
          <div className="perfil-modal" onClick={e => e.stopPropagation()}>

            <div className="perfil-header">
              <div className="perfil-avatar">{iniciales}</div>
              <div className="perfil-header-info">
                <h2 className="perfil-nombre">{nombreCompleto}</h2>
                <span className="perfil-rol">Administrador</span>
              </div>
              <button className="perfil-close" onClick={() => setModalPerfil(false)}>✕</button>
            </div>

            <div className="perfil-tabs">
              <button
                className={`perfil-tab ${tabPerfil === 'info' ? 'active' : ''}`}
                onClick={() => { setTabPerfil('info'); setPwdMsg(null); }}
              >
                Mis datos
              </button>
              <button
                className={`perfil-tab ${tabPerfil === 'password' ? 'active' : ''}`}
                onClick={() => { setTabPerfil('password'); setPwdMsg(null); }}
              >
                Cambiar contraseña
              </button>
            </div>

            {tabPerfil === 'info' && usuario && (
              <div className="perfil-body">
                <div className="perfil-campo">
                  <span className="perfil-campo-label">Nombre</span>
                  <span className="perfil-campo-valor">{usuario.usuario_nombre}</span>
                </div>
                <div className="perfil-campo">
                  <span className="perfil-campo-label">Apellido paterno</span>
                  <span className="perfil-campo-valor">{usuario.usuario_aPaterno}</span>
                </div>
                <div className="perfil-campo">
                  <span className="perfil-campo-label">Apellido materno</span>
                  <span className="perfil-campo-valor">{usuario.usuario_aMaterno || '—'}</span>
                </div>
                <div className="perfil-campo">
                  <span className="perfil-campo-label">Matrícula</span>
                  <span className="perfil-campo-valor perfil-matricula">{usuario.matricula_id}</span>
                </div>
                <div className="perfil-campo">
                  <span className="perfil-campo-label">Rol</span>
                  <span className="perfil-campo-valor">
                    <span className="perfil-badge">Administrador</span>
                  </span>
                </div>
              </div>
            )}

            {tabPerfil === 'password' && (
              <div className="perfil-body">
                {pwdMsg && (
                  <div className={`perfil-msg ${pwdMsg.tipo}`}>{pwdMsg.texto}</div>
                )}
                <div className="perfil-form-group">
                  <label>Nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={pwd.nueva}
                    onChange={e => setPwd({ ...pwd, nueva: e.target.value })}
                  />
                </div>
                <div className="perfil-form-group">
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    placeholder="Repite la nueva contraseña"
                    value={pwd.confirmar}
                    onChange={e => setPwd({ ...pwd, confirmar: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleCambiarPassword()}
                  />
                </div>
                <button
                  className="perfil-btn-guardar"
                  onClick={handleCambiarPassword}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}