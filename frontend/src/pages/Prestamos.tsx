// src/pages/Prestamos.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Prestamos.css'

const API        = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const POR_PAGINA = 10

type Tab = 'activos' | 'historial' | 'multas'

interface Multa {
  multa_id:           number
  prestamo_id:        number
  libro_titulo:       string
  multa_dias_bloqueo: number
  multa_motivo:       string
  multa_fecha_inicio: string
  multa_fecha_fin:    string
  multa_estatus:      'Activa' | 'Cumplida'
}

interface Prestamo {
  prestamo_id:                     number
  libro_id:                        number
  libro_titulo:                    string
  libro_autor:                     string
  prestamo_fecha_salida:           string
  prestamo_fecha_entrega_esperada: string
  prestamo_fecha_devolucion_real:  string | null
  prestamo_estatus:                'Pendiente' | 'Activo' | 'Devuelto' | 'Vencido' | 'Cancelado'
  prestamo_dias_plazo:             number
  dias_retraso:                    number
  prestamo_entregado_admin:        boolean
  prestamo_fecha_entrega_real:     string | null
}

export default function Prestamos() {
  const navigate = useNavigate()

  const [prestamos,   setPrestamos]   = useState<Prestamo[]>([])
  const [multas,      setMultas]      = useState<Multa[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<Tab>('activos')
  const [pagina,      setPagina]      = useState(1)
  const [msg,         setMsg]         = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [modalCancel, setModalCancel] = useState<Prestamo | null>(null)
  const [cancelando,  setCancelando]  = useState(false)

  const token   = localStorage.getItem('token')
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const cargar = async () => {
    setLoading(true)
    try {
      const [rPrest, rMultas] = await Promise.all([
        fetch(`${API}/prestamos/`, { headers }),
        fetch(`${API}/multas/`,    { headers }),
      ])
      if (!rPrest.ok || !rMultas.ok) throw new Error()
      setPrestamos(await rPrest.json())
      setMultas(await rMultas.json())
    } catch {
      mostrar('err', 'Error al cargar préstamos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4500)
  }

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const activos = prestamos.filter(p => ['Pendiente', 'Activo', 'Vencido'].includes(p.prestamo_estatus))
  const pasados = prestamos.filter(p => ['Devuelto', 'Cancelado'].includes(p.prestamo_estatus))
  const multasActivas = multas.filter(m => m.multa_estatus === 'Activa').length

  const totalPaginas  = Math.ceil(pasados.length / POR_PAGINA)
  const pasadosPagina = pasados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const diasRestantes = (p: Prestamo) => {
    if (!p.prestamo_entregado_admin) return null
    const hoy   = new Date(); hoy.setHours(0, 0, 0, 0)
    const limit = new Date(p.prestamo_fecha_entrega_esperada + 'T00:00:00')
    return Math.ceil((limit.getTime() - hoy.getTime()) / 86_400_000)
  }

  const urgClass = (dias: number | null) => {
    if (dias === null) return 'gris'
    return dias <= 0 ? 'roja' : dias === 1 ? 'amarilla' : 'verde'
  }

  const cambiarTab = (t: Tab) => { setTab(t); setPagina(1) }

  // ── Cancelar préstamo ─────────────────────────────────────────────────────
  const handleCancelar = async () => {
    if (!modalCancel) return
    setCancelando(true)
    try {
      const r    = await fetch(`${API}/prestamos/${modalCancel.prestamo_id}/cancelar/`, {
        method: 'PATCH', headers,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al cancelar')
      mostrar('ok', '✓ Préstamo cancelado. El libro fue liberado.')
      setModalCancel(null)
      cargar()
    } catch (e: any) {
      mostrar('err', e.message)
    } finally {
      setCancelando(false)
    }
  }

  const Paginador = () => (
    <div className="prest-paginador">
      <button className="pag-btn" onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>← Anterior</button>
      <div className="pag-nums">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="pag-ellipsis">…</span>
              : <button key={p} className={`pag-num ${pagina === p ? 'activo' : ''}`} onClick={() => setPagina(p as number)}>{p}</button>
          )
        }
      </div>
      <button className="pag-btn" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>Siguiente →</button>
    </div>
  )

  return (
    <div className="prest-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="prest-hero">
        <div>
          <div className="prest-breadcrumb">Biblioteca WEB / Mis Préstamos</div>
          <h1 className="prest-h1">Mis Préstamos</h1>
          <p className="prest-subtitle">
            Puedes tener hasta <strong>3 préstamos activos</strong> a la vez.
            Elige entre 3, 5 o 7 días de plazo al solicitar.
          </p>
        </div>
        <div className="prest-hero-stats">
          <div className="prest-stat">
            <span className="psn">{activos.length}</span>
            <span className="psl">Activos</span>
          </div>
          <div className="prest-stat-sep" />
          <div className="prest-stat">
            <span className="psn" style={multasActivas > 0 ? { color: '#ef4444' } : {}}>
              {multasActivas}
            </span>
            <span className="psl">Multas</span>
          </div>
          <div className="prest-stat-sep" />
          <div className="prest-stat">
            <span className="psn">{pasados.length}</span>
            <span className="psl">Historial</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`prest-notif ${msg.tipo}`}>
          {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="prest-tabs-wrap">
        <button className={`prest-tab ${tab === 'activos'   ? 'activo' : ''}`} onClick={() => cambiarTab('activos')}>
          Activos
        </button>
        <button className={`prest-tab ${tab === 'historial' ? 'activo' : ''}`} onClick={() => cambiarTab('historial')}>
          Historial
        </button>
        <button className={`prest-tab ${tab === 'multas'    ? 'activo' : ''}`} onClick={() => cambiarTab('multas')}>
          Multas
          {multasActivas > 0 && <span className="prest-tab-badge">{multasActivas}</span>}
        </button>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div className="prest-loading"><div className="prest-spinner" /><p>Cargando…</p></div>
        ) : (
          <>
            {/* ════ TAB ACTIVOS ════ */}
            {tab === 'activos' && (
              <section className="prest-section">
                {activos.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">📚</div>
                    <h3>Sin préstamos activos</h3>
                    <p>Desde el catálogo puedes solicitar un préstamo de cualquier libro disponible.</p>
                    <button className="prest-btn-catalogo" onClick={() => navigate('/libros')}>
                      Ir al catálogo →
                    </button>
                  </div>
                ) : (
                  <div className="prest-grid">
                    {activos.map(p => {
                      const dias = diasRestantes(p)
                      const urg  = urgClass(dias)
                      return (
                        <div key={p.prestamo_id} className={`prest-card urg-${urg}`}>

                          {/* ── Banner estado entrega ── */}
                          {p.prestamo_estatus === 'Pendiente' ? (
                            <div className="prest-entrega-banner pendiente-entrega">
                              <span className="prest-entrega-ico">⏳</span>
                              <div>
                                <p className="prest-entrega-titulo">Pendiente de entrega</p>
                                <p className="prest-entrega-sub">
                                  Tu libro está siendo preparado. Pasa a la biblioteca a recogerlo.
                                </p>
                              </div>
                            </div>
                          ) : p.prestamo_entregado_admin && p.prestamo_fecha_entrega_real ? (
                            <div className="prest-entrega-banner entregado">
                              <span className="prest-entrega-ico">✅</span>
                              <div>
                                <p className="prest-entrega-titulo">Libro entregado</p>
                                <p className="prest-entrega-sub">
                                  Recibiste el libro el <strong>{fc(p.prestamo_fecha_entrega_real)}</strong>.
                                  El plazo corre desde ese día.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          {/* ── Pill urgencia ── */}
                          <div className="prest-card-top">
                            {p.prestamo_entregado_admin && dias !== null ? (
                              <span className={`prest-urg-pill urg-${urg}`}>
                                {p.prestamo_estatus === 'Vencido'
                                  ? `🔴 ${Math.abs(dias)}d de retraso`
                                  : dias === 0 ? '🔴 Vence hoy'
                                  : dias === 1 ? '🟡 Vence mañana'
                                  : `🟢 ${dias} días restantes`}
                              </span>
                            ) : (
                              <span className="prest-urg-pill urg-gris">🕐 En espera de entrega</span>
                            )}
                          </div>

                          <h3 className="prest-card-titulo">{p.libro_titulo}</h3>
                          <p className="prest-card-autor">{p.libro_autor}</p>

                          <div className="prest-card-fechas">
                            <div>
                              <span className="pfl">Solicitado</span>
                              <span className="pfv">{fc(p.prestamo_fecha_salida)}</span>
                            </div>
                            {p.prestamo_entregado_admin && p.prestamo_fecha_entrega_real && (
                              <div>
                                <span className="pfl">Recibido</span>
                                <span className="pfv green">{fc(p.prestamo_fecha_entrega_real)}</span>
                              </div>
                            )}
                            {p.prestamo_entregado_admin && (
                              <div>
                                <span className="pfl">Fecha límite</span>
                                <span className={`pfv ${p.prestamo_estatus === 'Vencido' ? 'red' : ''}`}>
                                  {fc(p.prestamo_fecha_entrega_esperada)}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="pfl">Plazo</span>
                              <span className="pfv">{p.prestamo_dias_plazo} días hábiles</span>
                            </div>
                          </div>

                          {/* ── Botón cancelar — SOLO si Pendiente ── */}
                          {p.prestamo_estatus === 'Pendiente' && (
                            <div className="prest-card-footer">
                              <button
                                className="prest-btn-cancelar"
                                onClick={() => setModalCancel(p)}
                              >
                                Cancelar préstamo
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ════ TAB HISTORIAL ════ */}
            {tab === 'historial' && (
              <section className="prest-section">
                {pasados.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">📋</div>
                    <h3>Sin historial todavía</h3>
                    <p>Aquí aparecerán tus préstamos devueltos.</p>
                  </div>
                ) : (
                  <>
                    <div className="prest-tabla-wrap">
                      <table className="prest-tabla">
                        <thead>
                          <tr>
                            <th>Libro</th>
                            <th>Recibido</th>
                            <th>Fecha límite</th>
                            <th>Devuelto</th>
                            <th>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pasadosPagina.map(p => (
                            <tr key={p.prestamo_id}>
                              <td>
                                <div className="td-bold">{p.libro_titulo}</div>
                                <div className="td-muted">{p.libro_autor}</div>
                              </td>
                              <td className="td-muted">
                                {p.prestamo_fecha_entrega_real ? fc(p.prestamo_fecha_entrega_real) : '—'}
                              </td>
                              <td className="td-muted">{fc(p.prestamo_fecha_entrega_esperada)}</td>
                              <td className="td-muted">
                                {p.prestamo_fecha_devolucion_real ? fc(p.prestamo_fecha_devolucion_real) : '—'}
                              </td>
                              <td>
                                <span className={`prest-pill ${p.prestamo_estatus.toLowerCase()}`}>
                                  {p.prestamo_estatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPaginas > 1 && <Paginador />}
                  </>
                )}
              </section>
            )}

            {/* ════ TAB MULTAS ════ */}
            {tab === 'multas' && (
              <section className="prest-section">
                {multas.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">✅</div>
                    <h3>Sin multas</h3>
                    <p>No tienes ninguna multa registrada.</p>
                  </div>
                ) : (
                  <div className="prest-tabla-wrap">
                    <table className="prest-tabla">
                      <thead>
                        <tr>
                          <th>Libro</th>
                          <th>Motivo</th>
                          <th>Inicio bloqueo</th>
                          <th>Fin bloqueo</th>
                          <th>Días</th>
                          <th>Estatus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multas.map(m => (
                          <tr key={m.multa_id}>
                            <td className="td-bold">{m.libro_titulo}</td>
                            <td className="td-muted">{m.multa_motivo}</td>
                            <td className="td-muted">{fc(m.multa_fecha_inicio)}</td>
                            <td className="td-muted">{fc(m.multa_fecha_fin)}</td>
                            <td className="td-muted">{m.multa_dias_bloqueo}d</td>
                            <td>
                              <span className={`prest-pill ${m.multa_estatus === 'Activa' ? 'vencido' : 'devuelto'}`}>
                                {m.multa_estatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
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
            {[['Catálogo', '/libros'], ['Préstamos', '/prestamos'], ['Apartados', '/apartados']].map(([l, r]) => (
              <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Cuenta</p>
            {usuario
              ? [['Mis préstamos', '/prestamos'], ['Mis apartados', '/apartados']].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
              : [['Iniciar sesión', '/login'], ['Registrarse', '/registro']].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
            }
          </div>
          <div>
            <p className="footer-heading">Boletín informativo</p>
            <p className="footer-desc">Recibe novedades directamente en tu correo institucional.</p>
            <div className="newsletter-row">
              <input className="newsletter-input" placeholder="tu@alumno.web.mx" />
              <button className="newsletter-btn">Suscribir</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Biblioteca WEB · Todos los derechos reservados</span>
          <span>Privacidad · Términos de uso · Accesibilidad</span>
        </div>
      </footer>

      {/* ══ MODAL CANCELAR ══ */}
      {modalCancel && (
        <div className="prest-backdrop" onClick={() => setModalCancel(null)}>
          <div className="prest-modal" onClick={e => e.stopPropagation()}>
            <button className="prest-modal-x" onClick={() => setModalCancel(null)}>✕</button>
            <div className="prest-modal-ico">📚</div>
            <h2 className="prest-modal-title">¿Cancelar préstamo?</h2>

            <div className="prest-modal-info">
              <div className="prest-modal-row">
                <span>Libro</span>
                <strong>{modalCancel.libro_titulo}</strong>
              </div>
              <div className="prest-modal-row">
                <span>Autor</span>
                <strong>{modalCancel.libro_autor}</strong>
              </div>
              <div className="prest-modal-row">
                <span>Solicitado</span>
                <strong>{fc(modalCancel.prestamo_fecha_salida)}</strong>
              </div>
              <div className="prest-modal-row">
                <span>Plazo</span>
                <strong>{modalCancel.prestamo_dias_plazo} días hábiles</strong>
              </div>
            </div>

            <p className="prest-modal-aviso">
              El libro aún no ha sido entregado, por lo que puedes cancelar sin penalización.
              El ejemplar quedará disponible para otros usuarios.
            </p>

            <div className="prest-modal-btns">
              <button
                className="prest-modal-btn-confirmar"
                onClick={handleCancelar}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando…' : 'Sí, cancelar préstamo'}
              </button>
              <button className="prest-modal-btn-cerrar" onClick={() => setModalCancel(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}