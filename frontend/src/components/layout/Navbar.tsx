// src/components/layout/Navbar.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "./Navbar.css";

interface Usuario {
  usuario_id:              number;
  usuario_nombre:          string;
  matricula_id:            string;
  esta_bloqueado:          boolean;
  dias_bloqueo_restantes:  number;
  usuario_bloqueado_hasta: string | null;
  usuario_rol:             string;
}

interface Props {
  usuario: Usuario | null;
  onCerrarSesion: () => void;
}

export default function Navbar({ usuario, onCerrarSesion }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) {
        setPerfilOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cierra el menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); setPerfilOpen(false); }, [location.pathname]);

  // Bloquea el scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const irA = (ruta: string) => {
    if (!usuario) navigate("/login");
    else navigate(ruta);
    setMenuOpen(false);
  };

  const activo = (ruta: string) =>
    location.pathname === ruta ? "nav-item active" : "nav-item";

  const inicial = usuario?.usuario_nombre?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header className="home-header">
        <div className="header-inner">
          <div className="logo-wrap" onClick={() => { navigate("/"); setMenuOpen(false); }}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>

          {/* Hamburger */}
          <button
            className={`hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Drawer móvil — fuera del header para evitar problemas de posicionamiento */}
      <div className={`mobile-drawer${menuOpen ? " open" : ""}`}>
        <nav>
          <ul className="nav-list">
            <li className={activo("/")}         onClick={() => { navigate("/");          setMenuOpen(false); }}>Inicio</li>
            <li className={activo("/libros")}    onClick={() => { navigate("/libros");    setMenuOpen(false); }}>Catálogo</li>
            <li className={activo("/prestamos")} onClick={() => irA("/prestamos")}>Préstamos</li>
            <li className={activo("/apartados")} onClick={() => irA("/apartados")}>Apartados</li>
          </ul>
        </nav>

        <div className="mobile-drawer-divider" />

        {usuario ? (
          <div className="mobile-usuario">
            {/* Info del usuario */}
            <div className="mobile-perfil-header">
              <div className="mobile-perfil-avatar">{inicial}</div>
              <div>
                <p className="mobile-perfil-nombre">{usuario.usuario_nombre}</p>
                <p className="mobile-perfil-matricula">{usuario.matricula_id}</p>
                <span className={`perfil-dd-rol rol-${usuario.usuario_rol}`}>
                  {usuario.usuario_rol === 'alumno' ? '🎓 Alumno' : '👨‍🏫 Docente'}
                </span>
              </div>
            </div>

            {usuario.esta_bloqueado && (
              <div className="mobile-bloqueo-pill">
                🔒 Bloqueado · {usuario.dias_bloqueo_restantes}d
              </div>
            )}

            {/* Toggle tema */}
            <div className="mobile-drawer-item mobile-toggle-row">
              <div className="perfil-dd-item-icon icon-theme">
                {darkMode ? "🌙" : "☀️"}
              </div>
              <span className="mobile-drawer-label">Tema oscuro</span>
              <button
                className={`theme-toggle${darkMode ? " on" : ""}`}
                onClick={toggleDarkMode}
                aria-label="Toggle tema"
              >
                <span className="theme-toggle-thumb" />
              </button>
            </div>

            <div className="mobile-drawer-divider" />

            {/* Cerrar sesión */}
            <button
              className="mobile-drawer-item mobile-logout"
              onClick={() => { onCerrarSesion(); setMenuOpen(false); }}
            >
              <div className="perfil-dd-item-icon icon-logout">🚪</div>
              <span className="mobile-drawer-label">Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <div className="mobile-auth-btns">
            <button className="btn-outline" onClick={() => { navigate("/login");    setMenuOpen(false); }}>
              Iniciar sesión
            </button>
            <button className="btn-primary" onClick={() => { navigate("/registro"); setMenuOpen(false); }}>
              Registrarse
            </button>
          </div>
        )}
      </div>

      {/* Overlay */}
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Desktop nav — oculto en móvil via CSS */}
      <div className="desktop-nav-bar">
        <div className="header-inner-desktop">
          <div className="logo-wrap" onClick={() => navigate("/")}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>

          <nav>
            <ul className="nav-list">
              <li className={activo("/")}         onClick={() => navigate("/")}>Inicio</li>
              <li className={activo("/libros")}    onClick={() => navigate("/libros")}>Catálogo</li>
              <li className={activo("/prestamos")} onClick={() => irA("/prestamos")}>Préstamos</li>
              <li className={activo("/apartados")} onClick={() => irA("/apartados")}>Apartados</li>
            </ul>
          </nav>

          <div className="header-actions">
            {usuario ? (
              <div className="usuario-sesion">
                {usuario.esta_bloqueado && (
                  <div className="header-bloqueo-pill">
                    🔒 Bloqueado · {usuario.dias_bloqueo_restantes}d
                  </div>
                )}

                <div className="perfil-wrap" ref={perfilRef}>
                  <button
                    className="perfil-trigger"
                    onClick={() => setPerfilOpen(prev => !prev)}
                    aria-label="Perfil"
                  >
                    <span className="perfil-nombre">{usuario.usuario_nombre}</span>
                    <svg
                      className={`perfil-chevron${perfilOpen ? " open" : ""}`}
                      width="13" height="13" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {perfilOpen && (
                    <div className="perfil-dropdown">
                      <div className="perfil-dd-header">
                        <div className="perfil-dd-avatar">{inicial}</div>
                        <div className="perfil-dd-info">
                          <p className="perfil-dd-nombre">{usuario.usuario_nombre}</p>
                          <p className="perfil-dd-matricula">{usuario.matricula_id}</p>
                          <span className={`perfil-dd-rol rol-${usuario.usuario_rol}`}>
                            {usuario.usuario_rol === 'alumno' ? '🎓 Alumno' : '👨‍🏫 Docente'}
                          </span>
                        </div>
                      </div>

                      <div className="perfil-dd-body">
                        <div className="perfil-dd-item perfil-dd-toggle">
                          <div className="perfil-dd-item-icon icon-theme">
                            {darkMode ? "🌙" : "☀️"}
                          </div>
                          <span className="perfil-dd-item-label">Tema oscuro</span>
                          <button
                            className={`theme-toggle${darkMode ? " on" : ""}`}
                            onClick={toggleDarkMode}
                            aria-label="Toggle tema"
                          >
                            <span className="theme-toggle-thumb" />
                          </button>
                        </div>

                        <div className="perfil-dd-divider" />

                        <button
                          className="perfil-dd-item perfil-dd-logout"
                          onClick={() => { onCerrarSesion(); setPerfilOpen(false); }}
                        >
                          <div className="perfil-dd-item-icon icon-logout">🚪</div>
                          <span className="perfil-dd-item-label">Cerrar sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="usuario-sesion">
                <button className="btn-outline" onClick={() => navigate("/login")}>Iniciar sesión</button>
                <button className="btn-primary" onClick={() => navigate("/registro")}>Registrarse</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}