import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getLibros, getCategorias, crearApartado, crearPrestamo, type Libro, type Categoria } from "../services/api"
import "./Libros.css"

const POR_PAGINA = 12

interface ModalApartado {
  libro: Libro
  tipo: 'apartar' | 'prestar'
}

interface ModalDetalle {
  libro: Libro
}

const COVER_PALETTES = [
  { bg: ['#1e3a5f', '#2d6a9f'], text: '#e8f4fd' },
  { bg: ['#2d1b4e', '#6b35a0'], text: '#f0e8ff' },
  { bg: ['#1a3a2a', '#2d7a50'], text: '#e8f5ee' },
  { bg: ['#3a1a1a', '#9a3030'], text: '#fde8e8' },
  { bg: ['#1a2a3a', '#2d5a8a'], text: '#e8f0fd' },
  { bg: ['#2a2a1a', '#7a7020'], text: '#fdfae8' },
  { bg: ['#1a3a3a', '#207a7a'], text: '#e8fdfd' },
  { bg: ['#3a2a1a', '#9a6020'], text: '#fdf0e8' },
]

const getPalette = (titulo: string) => {
  const sum = titulo.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COVER_PALETTES[sum % COVER_PALETTES.length]
}

const abreviar = (txt: string, max: number) =>
  txt.length > max ? txt.slice(0, max).trim() + '…' : txt

function BookCover({ libro, size = 'md' }: { libro: Libro; size?: 'sm' | 'md' | 'lg' }) {
  const [imgOk, setImgOk] = useState<boolean | null>(null)
  const palette = getPalette(libro.libro_titulo)

  const coverUrl = libro.libro_isbn
    ? `https://covers.openlibrary.org/b/isbn/${libro.libro_isbn.replace(/-/g, '')}-M.jpg`
    : null

  const heights: Record<string, number> = { sm: 120, md: 180, lg: 240 }
  const h = heights[size]

  return (
    <div className={`book-cover book-cover-${size}`} style={{ height: h }}>
      {coverUrl && imgOk !== false && (
        <img
          src={coverUrl}
          alt={libro.libro_titulo}
          className={`book-cover-img${imgOk ? ' loaded' : ''}`}
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
        />
      )}
      {(imgOk === false || !coverUrl) && (
        <div
          className="book-cover-generated"
          style={{
            background: `linear-gradient(145deg, ${palette.bg[0]}, ${palette.bg[1]})`,
            color: palette.text,
          }}
        >
          <div className="bcg-spine" style={{ background: palette.bg[0] }} />
          <div className="bcg-content">
            <div className="bcg-deco">
              <div className="bcg-circle" style={{ borderColor: palette.text + '30' }} />
              <div className="bcg-line" style={{ background: palette.text + '40' }} />
              <div className="bcg-line short" style={{ background: palette.text + '30' }} />
            </div>
            <p className="bcg-titulo">{abreviar(libro.libro_titulo, size === 'lg' ? 60 : 40)}</p>
            <p className="bcg-autor">{abreviar(libro.libro_autor, 30)}</p>
          </div>
          <div className="bcg-bottom-bar" style={{ background: palette.bg[0] + 'aa' }} />
        </div>
      )}
      {coverUrl && imgOk === null && (
        <div className="book-cover-shimmer" />
      )}
    </div>
  )
}

export default function Libros() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [libros,          setLibros]          = useState<Libro[]>([])
  const [categorias,      setCategorias]      = useState<Categoria[]>([])
  const [busqueda,        setBusqueda]        = useState(searchParams.get("busqueda") || "")
  const [categoria,       setCategoria]       = useState("")
  const [cargando,        setCargando]        = useState(true)
  const [error,           setError]           = useState("")
  const [modal,           setModal]           = useState<ModalApartado | null>(null)
  const [modalDetalle,    setModalDetalle]    = useState<ModalDetalle | null>(null)
  const [accionando,      setAccionando]      = useState(false)
  const [msg,             setMsg]             = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [diasPrestamo,    setDiasPrestamo]    = useState<3 | 5 | 7>(7)
  const [pagina,          setPagina]          = useState(1)
  const [modalPrivacidad, setModalPrivacidad] = useState(false)

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    setError("")
    setPagina(1)
    getLibros(busqueda, categoria)
      .then(data => { setLibros(data); setCargando(false) })
      .catch(() => { setError("No se pudieron cargar los libros"); setCargando(false) })
  }, [busqueda, categoria])

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleApartar = async () => {
    if (!modal) return
    if (!usuario) { navigate("/login"); return }
    setAccionando(true)
    try {
      await crearApartado(modal.libro.libro_id)
      mostrar('ok', `"${modal.libro.libro_titulo}" apartado correctamente.`)
      setModal(null)
      getLibros(busqueda, categoria).then(setLibros)
    } catch (e: any) {
      mostrar('err', e.message)
      setModal(null)
    } finally {
      setAccionando(false)
    }
  }

  const handlePrestar = async () => {
    if (!modal) return
    if (!usuario) { navigate("/login"); return }
    setAccionando(true)
    try {
      await crearPrestamo(modal.libro.libro_id, diasPrestamo)
      mostrar('ok', `Préstamo de "${modal.libro.libro_titulo}" creado. Tienes ${diasPrestamo} días para devolverlo.`)
      setModal(null)
      setDiasPrestamo(7)
      getLibros(busqueda, categoria).then(setLibros)
    } catch (e: any) {
      mostrar('err', e.message)
      setModal(null)
    } finally {
      setAccionando(false)
    }
  }

  const abrirModal = (libro: Libro, tipo: 'apartar' | 'prestar') => {
    if (!usuario) { navigate("/login"); return }
    setDiasPrestamo(7)
    setModal({ libro, tipo })
    setModalDetalle(null)
  }

  const totalPaginas = Math.ceil(libros.length / POR_PAGINA)
  const librosPagina = libros.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const irPagina = (p: number) => {
    setPagina(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="libros-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Hero */}
      <div className="libros-hero">
        <div className="libros-hero-content">
          <div className="libros-breadcrumb">Biblioteca WEB / Catálogo</div>
          <h1 className="libros-h1">Catálogo de libros</h1>
          <p className="libros-subtitle">Encuentra tu próxima lectura entre nuestra colección</p>
        </div>
        <div className="libros-hero-right">
          {usuario && (
            <div className="libros-usuario-pill">
              <div className="libros-usuario-avatar">{usuario.usuario_nombre[0]}</div>
              <div>
                <span className="libros-usuario-nombre">{usuario.usuario_nombre}</span>
                <span className="libros-usuario-rol">{usuario.usuario_rol}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className={`libros-notif ${msg.tipo}`}>
          {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="libros-filtros-wrap">
        <div className="libros-filtros">
          <div className="filtro-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="filtro-input"
              type="text"
              placeholder="Buscar por título o autor…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="filtro-clear" onClick={() => setBusqueda("")}>✕</button>
            )}
          </div>
          <select
            className="filtro-select"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.categoria_id} value={cat.categoria_id}>
                {cat.categoria_nombre}
              </option>
            ))}
          </select>
          <div className="filtro-results">
            {!cargando && (
              <span>
                {libros.length} resultado{libros.length !== 1 ? 's' : ''}
                {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="libros-content" style={{ flex: 1 }}>
        {error && (
          <div className="libros-error-state">
            <span>⚠️</span><p>{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="libros-loading">
            <div className="libros-spinner" />
            <p>Cargando catálogo…</p>
          </div>
        ) : libros.length === 0 ? (
          <div className="libros-empty">
            <div className="libros-empty-ico">📚</div>
            <h3>Sin resultados</h3>
            <p>No se encontraron libros.</p>
            <button className="libros-empty-btn" onClick={() => { setBusqueda(""); setCategoria("") }}>
              Aceptar
            </button>
          </div>
        ) : (
          <>
            <div className="libros-grid">
              {librosPagina.map(libro => (
                <div key={libro.libro_id} className="libro-card">
                  <div
                    className="libro-cover-wrap"
                    onClick={() => setModalDetalle({ libro })}
                    style={{ cursor: 'pointer' }}
                  >
                    <BookCover libro={libro} size="md" />
                    <span className={`libro-badge ${libro.libro_ejemplares > 0 ? "disponible" : "agotado"}`}>
                      {libro.libro_ejemplares > 0 ? `${libro.libro_ejemplares} disponibles` : "Agotado"}
                    </span>
                    <div className="libro-cover-overlay">
                      <span className="libro-cover-overlay-txt">Ver descripción</span>
                    </div>
                  </div>

                  <div className="libro-body">
                    <span className="libro-categoria">{libro.categoria_nombre}</span>
                    <p
                      className="libro-titulo"
                      onClick={() => setModalDetalle({ libro })}
                      style={{ cursor: 'pointer' }}
                    >
                      {libro.libro_titulo}
                    </p>
                    <p className="libro-autor">{libro.libro_autor}</p>
                    <p className="libro-isbn">ISBN: {libro.libro_isbn}</p>
                  </div>

                  <div className="libro-acciones">
                    {libro.libro_ejemplares > 0 ? (
                      <>
                        <button className="btn-prestar" onClick={() => abrirModal(libro, 'prestar')}>
                          Solicitar préstamo
                        </button>
                        <button className="btn-apartar-outline" onClick={() => abrirModal(libro, 'apartar')}>
                          Apartar
                        </button>
                      </>
                    ) : (
                      <button className="btn-apartar-agotado" onClick={() => abrirModal(libro, 'apartar')}>
                        🔖 Apartar para cuando esté disponible
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="libros-paginador">
                <button className="pag-btn" onClick={() => irPagina(pagina - 1)} disabled={pagina === 1}>
                  ← Anterior
                </button>
                <div className="pag-nums">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, idx) =>
                      p === '...'
                        ? <span key={`ellipsis-${idx}`} className="pag-ellipsis">…</span>
                        : <button
                            key={p}
                            className={`pag-num ${pagina === p ? 'activo' : ''}`}
                            onClick={() => irPagina(p as number)}
                          >{p}</button>
                    )
                  }
                </div>
                <button className="pag-btn" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL DETALLE DEL LIBRO ══ */}
      {modalDetalle && (
        <div className="libros-backdrop" onClick={() => setModalDetalle(null)}>
          <div className="libros-modal libros-modal-detalle" onClick={e => e.stopPropagation()}>
            <button className="libros-modal-x" onClick={() => setModalDetalle(null)}>✕</button>
            <div className="libros-modal-cover">
              <BookCover libro={modalDetalle.libro} size="lg" />
            </div>
            <div className="libros-detalle-badges">
              {modalDetalle.libro.categoria_nombre && (
                <span className="libros-detalle-badge categoria">{modalDetalle.libro.categoria_nombre}</span>
              )}
              <span className={`libros-detalle-badge ${modalDetalle.libro.libro_ejemplares > 0 ? 'disponible' : 'agotado'}`}>
                {modalDetalle.libro.libro_ejemplares > 0
                  ? `${modalDetalle.libro.libro_ejemplares} disponibles`
                  : 'Agotado'}
              </span>
            </div>
            <h2 className="libros-modal-titulo">{modalDetalle.libro.libro_titulo}</h2>
            <p className="libros-modal-autor">{modalDetalle.libro.libro_autor}</p>
            <p className="libros-detalle-isbn">ISBN: {modalDetalle.libro.libro_isbn}</p>
            {modalDetalle.libro.libro_descripcion ? (
              <div className="libros-detalle-desc">
                <p className="libros-detalle-desc-label">Descripción</p>
                <p className="libros-detalle-desc-texto">{modalDetalle.libro.libro_descripcion}</p>
              </div>
            ) : (
              <div className="libros-detalle-desc">
                <p className="libros-detalle-desc-texto" style={{ fontStyle: 'italic' }}>
                  Sin descripción disponible.
                </p>
              </div>
            )}
            <div className="libros-modal-btns" style={{ marginTop: 20 }}>
              {modalDetalle.libro.libro_ejemplares > 0 ? (
                <>
                  <button className="libros-btn-confirmar" onClick={() => abrirModal(modalDetalle.libro, 'prestar')}>
                    Solicitar préstamo
                  </button>
                  <button className="libros-btn-cancel" onClick={() => abrirModal(modalDetalle.libro, 'apartar')}>
                    🔖 Apartar
                  </button>
                </>
              ) : (
                <button className="libros-btn-confirmar" onClick={() => abrirModal(modalDetalle.libro, 'apartar')}>
                  🔖 Apartar para cuando esté disponible
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PRÉSTAMO / APARTADO ══ */}
      {modal && (
        <div className="libros-backdrop" onClick={() => setModal(null)}>
          <div className="libros-modal" onClick={e => e.stopPropagation()}>
            <button className="libros-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="libros-modal-cover">
              <BookCover libro={modal.libro} size="lg" />
            </div>
            <p className="libros-modal-pre">
              {modal.tipo === 'prestar' ? 'Solicitar préstamo' : 'Apartar libro'}
            </p>
            <h2 className="libros-modal-titulo">{modal.libro.libro_titulo}</h2>
            <p className="libros-modal-autor">{modal.libro.libro_autor}</p>
            <div className="libros-modal-info">
              {modal.tipo === 'prestar' ? (
                <>
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Disponibilidad</span>
                    <span className="lmi-val green">{modal.libro.libro_ejemplares} ejemplar(es)</span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Duración elegida</span>
                    <span className="lmi-val">{diasPrestamo} días</span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Retraso</span>
                    <span className="lmi-val red">1 día bloqueado por día</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Estado del libro</span>
                    <span className={`lmi-val ${modal.libro.libro_ejemplares > 0 ? 'green' : 'red'}`}>
                      {modal.libro.libro_ejemplares > 0 ? 'Disponible' : 'Sin ejemplares'}
                    </span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  {modal.libro.libro_ejemplares === 0 && (
                    <>
                      <div className="libros-modal-info-item">
                        <span className="lmi-label">Espera máxima</span>
                        <span className="lmi-val">5 días</span>
                      </div>
                      <div className="libros-modal-info-sep" />
                    </>
                  )}
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Tiempo para recoger</span>
                    <span className="lmi-val">3 días</span>
                  </div>
                </>
              )}
            </div>
            {modal.tipo === 'prestar' && (
              <div className="libros-dias-selector">
                <span className="libros-dias-label">¿Cuántos días necesitas?</span>
                <div className="libros-dias-opciones">
                  {([3, 5, 7] as const).map(d => (
                    <button
                      key={d}
                      className={`libros-dia-btn ${diasPrestamo === d ? 'activo' : ''}`}
                      onClick={() => setDiasPrestamo(d)}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="libros-modal-aviso">
              {modal.tipo === 'prestar'
                ? `Al confirmar, el libro quedará registrado a tu nombre. Debes devolverlo en biblioteca dentro de ${diasPrestamo} días.`
                : modal.libro.libro_ejemplares > 0
                  ? 'El libro está disponible y será asignado a tu nombre de inmediato. Tendrás 3 días para pasar a recogerlo.'
                  : 'Te anotaremos en lista de espera. Una vez asignado, tendrás 3 días para recogerlo.'
              }
            </p>
            <div className="libros-modal-btns">
              <button
                className="libros-btn-confirmar"
                disabled={accionando}
                onClick={modal.tipo === 'prestar' ? handlePrestar : handleApartar}
              >
                {accionando ? 'Procesando…' : modal.tipo === 'prestar' ? 'Confirmar préstamo' : 'Confirmar apartado'}
              </button>
              <button className="libros-btn-cancel" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL POLÍTICA DE PRIVACIDAD ══ */}
      {modalPrivacidad && (
        <div className="privacidad-backdrop" onClick={() => setModalPrivacidad(false)}>
          <div className="privacidad-modal" onClick={e => e.stopPropagation()}>
            <div className="privacidad-modal-header">
              <h2>Política de Privacidad</h2>
              <button className="privacidad-modal-close" onClick={() => setModalPrivacidad(false)}>✕</button>
            </div>
            <div className="privacidad-modal-body">
              <h3>1. Responsable del tratamiento de datos</h3>
              <p>La institución educativa es responsable del tratamiento de los datos personales que los usuarios proporcionan al registrarse en el sistema de Biblioteca WEB.</p>
              <h3>2. Datos que recopilamos</h3>
              <p>Recopilamos únicamente los datos necesarios para la operación del servicio: nombre completo, apellidos, matrícula o número de trabajador, y correo electrónico. No se solicitan datos sensibles.</p>
              <h3>3. Finalidad del uso de datos</h3>
              <p>Los datos personales se utilizan exclusivamente para: gestionar el acceso al sistema, administrar préstamos y apartados de libros, enviar notificaciones relacionadas con el servicio.</p>
              <h3>4. Uso del correo electrónico</h3>
              <p>El correo electrónico registrado se emplea únicamente para comunicaciones del sistema de biblioteca. No será utilizado para fines publicitarios ni compartido con terceros.</p>
              <h3>5. Almacenamiento y seguridad</h3>
              <p>Los datos se almacenan en servidores institucionales con medidas de seguridad técnicas y administrativas para prevenir accesos no autorizados, pérdida o alteración de la información.</p>
              <h3>6. Derechos del usuario</h3>
              <p>El usuario tiene derecho a acceder, rectificar o solicitar la eliminación de sus datos personales. Para ejercer estos derechos, deberá acudir directamente al personal de la biblioteca.</p>
              <h3>7. Conservación de datos</h3>
              <p>Los datos se conservarán mientras el usuario mantenga una cuenta activa en el sistema. Una vez dada de baja la cuenta, los datos podrán eliminarse conforme a las políticas internas.</p>
              <h3>8. Cambios a esta política</h3>
              <p>La institución se reserva el derecho de actualizar esta política. Cualquier modificación relevante será notificada a los usuarios a través del correo registrado.</p>
            </div>
            <div className="privacidad-modal-footer">
              <button className="privacidad-btn-cerrar" onClick={() => setModalPrivacidad(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-row">
              <div className="footer-logo-icon">B</div>
              <span className="footer-logo-text">Biblioteca WEB</span>
            </div>
            <p className="footer-tagline">
              Tu portal de acceso al conocimiento académico. Préstamos, apartados y recursos digitales en un solo lugar.
            </p>
          </div>
          <div>
            <p className="footer-heading">Navegación</p>
            {[["Catálogo", "/libros"], ["Préstamos", "/prestamos"], ["Apartados", "/apartados"]].map(([l, r]) => (
              <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Cuenta</p>
            {usuario
              ? [["Mis préstamos", "/prestamos"], ["Mis apartados", "/apartados"]].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
              : [["Iniciar sesión", "/login"], ["Registrarse", "/registro"]].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
            }
          </div>
          <div>
            <p className="footer-heading">Horarios</p>
            <p className="footer-desc">📅 Lunes a Viernes</p>
            <p className="footer-desc">8:00 am — 4:00 pm</p>
            <p className="footer-desc" style={{ marginTop: 8 }}>📅 Sábado y Domingo</p>
            <p className="footer-desc">Cerrado</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Biblioteca WEB · Todos los derechos reservados</span>
          <div className="footer-bottom-links">
            <span className="footer-bottom-link" onClick={() => setModalPrivacidad(true)}>Privacidad</span>
            <span className="footer-bottom-sep">·</span>
            <span>Términos de uso</span>
            <span className="footer-bottom-sep">·</span>
            <span>Accesibilidad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}