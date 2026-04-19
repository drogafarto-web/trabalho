// ProfessorDashboard.jsx — Main triage screen + detail drawer

const { useState: useStateD, useEffect: useEffectD } = React;

function KPI({ label, value, delta, deltaPos, mono = true }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRight: '1px solid var(--border)',
      flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <div className={mono ? 'mono' : ''} style={{
          fontSize: 28,
          fontWeight: 600,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
          letterSpacing: '-0.02em',
          color: 'var(--text)',
        }}>{value}</div>
        {delta && (
          <span className="mono tnum" style={{
            fontSize: 11.5,
            color: deltaPos ? 'var(--success)' : 'var(--text-3)',
          }}>{delta}</span>
        )}
      </div>
    </div>
  );
}

function StatusTag({ status }) {
  const map = {
    ok:      { dot: 'dot-success', label: 'Publicada',    color: 'var(--text-2)' },
    review:  { dot: 'dot-warning', label: 'Revisar',      color: 'var(--warning)' },
    ai:      { dot: 'dot-primary', label: 'IA processando', color: 'var(--text-2)' },
    queued:  { dot: 'dot-muted',   label: 'Na fila',       color: 'var(--text-3)' },
    flag:    { dot: 'dot-danger',  label: 'Integridade',   color: 'var(--danger)' },
  };
  const m = map[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span className={`dot ${m.dot}`} />
      <span style={{ fontSize: 12, color: m.color }}>{m.label}</span>
    </div>
  );
}

function GradeBadge({ grade }) {
  if (grade === null || grade === undefined) {
    return <span className="mono" style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>;
  }
  let color;
  if (grade >= 9) color = 'var(--success)';
  else if (grade >= 7) color = 'var(--primary)';
  else if (grade >= 5) color = 'var(--warning)';
  else color = 'var(--danger)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span className="mono tnum" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
        {grade.toFixed(1)}
      </span>
      <span style={{
        width: 22, height: 3, borderRadius: 2, background: color,
      }} />
    </div>
  );
}

function DiscPill({ code, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 10px', borderRadius: 9999,
      fontSize: 11.5, fontWeight: 500,
      fontFamily: 'var(--font-mono)',
      color: active ? 'var(--text)' : 'var(--text-2)',
      background: active ? 'var(--surface-hi)' : 'transparent',
      border: `1px solid ${active ? 'var(--border-hi)' : 'var(--border)'}`,
      transition: 'all 120ms ease',
    }}>
      {code}
    </button>
  );
}

const SUBMISSIONS = [
  { id: 'TRB-2K6A-7F3', status: 'review', students: ['Beatriz Lins', 'Matheus Okada'], disc: 'PARA-2026.1', when: '18m', grade: 8.4, flag: false },
  { id: 'TRB-2K6A-7F4', status: 'flag', students: ['Carla Nunes', 'Diego Ramos', 'Lara Sato'], disc: 'PARA-2026.1', when: '24m', grade: 7.1, flag: 'Similaridade 78% com grupo G14' },
  { id: 'TRB-2K6A-7F5', status: 'ai', students: ['Rafael Moura'], disc: 'BIOQ-2026.1', when: '31m', grade: null },
  { id: 'TRB-2K6A-7F6', status: 'ok', students: ['Yasmin Cardoso', 'Gabriel Teles'], disc: 'MICR-2026.1', when: '1h 02m', grade: 9.2 },
  { id: 'TRB-2K6A-7F7', status: 'review', students: ['Paula Bianchi'], disc: 'PARA-2026.1', when: '1h 18m', grade: 6.3 },
  { id: 'TRB-2K6A-7F8', status: 'ok', students: ['Tiago Ferraz', 'Nathalia Khouri'], disc: 'BIOQ-2026.1', when: '2h 44m', grade: 8.8 },
  { id: 'TRB-2K6A-7F9', status: 'ai', students: ['Henrique Salles'], disc: 'FARM-2026.1', when: '3h 11m', grade: null },
  { id: 'TRB-2K6A-7FA', status: 'ok', students: ['Luana Peretto', 'Camila Andrade', 'Rodrigo Ihara'], disc: 'PARA-2026.1', when: '5h 08m', grade: 9.6 },
  { id: 'TRB-2K6A-7FB', status: 'review', students: ['Fernanda Brito'], disc: 'MICR-2026.1', when: 'ontem', grade: 5.7 },
  { id: 'TRB-2K6A-7FC', status: 'ok', students: ['Pedro Vilela', 'Ana Matoso'], disc: 'BIOQ-2026.1', when: 'ontem', grade: 7.4 },
];

function SubmissionRow({ row, onOpen, isOpen }) {
  const [hover, setHover] = useStateD(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(row.id)}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 110px 80px 100px 110px',
        alignItems: 'center',
        padding: '0 16px',
        height: 42,
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: isOpen ? 'var(--surface)' : hover ? 'rgba(255,255,255,0.015)' : 'transparent',
        transition: 'background 100ms ease',
      }}
    >
      <StatusTag status={row.status} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.students[0]}
          {row.students.length > 1 && (
            <span style={{ color: 'var(--text-3)' }}>{' '}+ {row.students.length - 1}</span>
          )}
        </div>
        {row.flag && (
          <span style={{
            fontSize: 10.5, color: 'var(--danger)',
            background: 'rgba(239,68,68,0.08)',
            padding: '1px 6px', borderRadius: 4,
          }}>!</span>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{row.disc}</div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{row.when}</div>
      <GradeBadge grade={row.grade} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {hover ? (
          <div style={{ display: 'flex', gap: 2 }} className="fade-in">
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onOpen(row.id); }}>Ver</button>
            <button className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 5.5a4.5 4.5 0 018-3M10 5.5a4.5 4.5 0 01-8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M9 1v2.5H6.5M2 10V7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>{ProfIcon.dots}</button>
          </div>
        ) : (
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{row.id.slice(-4)}</span>
        )}
      </div>
    </div>
  );
}

function DetailDrawer({ row, onClose }) {
  const [criteria, setCriteria] = useStateD([
    { name: 'Fundamentação teórica', ai: 2.0, edited: 2.0, max: 2.5 },
    { name: 'Clareza e argumentação', ai: 1.7, edited: 1.8, max: 2.0 },
    { name: 'Análise crítica do caso', ai: 2.3, edited: 2.2, max: 2.5 },
    { name: 'Referências (ABNT)',     ai: 1.2, edited: 1.2, max: 1.5 },
    { name: 'Originalidade',          ai: 1.2, edited: 1.2, max: 1.5 },
  ]);
  const [showOCR, setShowOCR] = useStateD(false);
  const total = criteria.reduce((s, c) => s + c.edited, 0);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 5,
        }}
      />
      <aside className="fade-in" style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 560,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        zIndex: 10,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusTag status={row.status} />
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>·</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.id}</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 4, color: 'var(--text)' }}>
              {row.students.join(' · ')}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
              <span className="mono">{row.disc}</span> · Parasitologia Clínica · enviado há {row.when}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={onClose}>{ProfIcon.close}</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Preview */}
          <div style={{ padding: 18 }}>
            <SectionLabel>Documento original</SectionLabel>
            <div style={{
              marginTop: 10,
              height: 180,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'repeating-linear-gradient(135deg, var(--surface-hi), var(--surface-hi) 8px, var(--surface) 8px, var(--surface) 16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  PDF embed · 7 páginas
                </div>
                <button className="btn btn-sm">Abrir em tela cheia</button>
              </div>
              <div style={{ position: 'absolute', top: 8, left: 8 }}>
                <FileIcon type="pdf" state="ok" />
              </div>
            </div>

            <button
              onClick={() => setShowOCR(!showOCR)}
              style={{
                marginTop: 14, fontSize: 12, color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ transform: showOCR ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', display: 'inline-flex' }}>
                <svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              Texto extraído (OCR)
            </button>
            {showOCR && (
              <div className="mono fade-in" style={{
                marginTop: 8, padding: 12,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 11, lineHeight: 1.7,
                color: 'var(--text-2)',
                maxHeight: 120, overflow: 'auto',
              }}>
                1. O ciclo biológico do <i>Trypanosoma cruzi</i> envolve dois hospedeiros obrigatórios: o invertebrado (triatomíneo) e o vertebrado (mamífero). No hospedeiro invertebrado, ocorrem as formas epimastigota e tripomastigota metacíclica…
              </div>
            )}
          </div>

          <div style={{ padding: '0 18px 18px' }}>
            <SectionLabel>Rubrica</SectionLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {criteria.map((c, i) => (
                <RubricSlider
                  key={i}
                  criterion={c}
                  onChange={v => setCriteria(criteria.map((x, j) => j === i ? { ...x, edited: v } : x))}
                />
              ))}
            </div>
            <div style={{
              marginTop: 14, padding: '10px 12px',
              borderRadius: 6, background: 'var(--bg)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nota final
              </div>
              <div className="mono tnum" style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
                {total.toFixed(1)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ 10</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 18px 18px' }}>
            <SectionLabel>Integridade</SectionLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Bar label="Similaridade entre grupos" value={row.flag ? 78 : 12} danger={row.flag} />
              <Bar label="Probabilidade de uso de IA" value={34} />
            </div>
            {row.flag && (
              <div style={{
                marginTop: 12, padding: 10,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.05)',
                borderRadius: 6,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text)', flex: 1, lineHeight: 1.5 }}>
                  {row.flag}
                </div>
                <button className="btn btn-sm" style={{ background: 'transparent', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                  Comparar
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: '0 18px 24px' }}>
            <SectionLabel>Feedback ao aluno</SectionLabel>
            <div style={{
              marginTop: 10, border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg)',
            }}>
              <div style={{ display: 'flex', gap: 2, padding: 6, borderBottom: '1px solid var(--border)' }}>
                <ToolBtn><b>B</b></ToolBtn>
                <ToolBtn><i>i</i></ToolBtn>
                <ToolBtn>•</ToolBtn>
                <ToolBtn>“</ToolBtn>
              </div>
              <textarea
                defaultValue="Boa fundamentação no ciclo biológico. Atenção à citação direta de Neves (2016) — falta indicar página. Análise do caso clínico poderia aprofundar o diagnóstico diferencial."
                style={{
                  width: '100%', minHeight: 76,
                  padding: 10, background: 'transparent',
                  border: 0, outline: 'none', resize: 'vertical',
                  fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6,
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8,
          background: 'var(--surface)',
        }}>
          <button className="btn">Devolver</button>
          <button className="btn">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 5.5a4.5 4.5 0 018-3M10 5.5a4.5 4.5 0 01-8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M9 1v2.5H6.5M2 10V7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Reprocessar IA
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary">Publicar nota</button>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      fontWeight: 500,
    }}>{children}</div>
  );
}

function ToolBtn({ children }) {
  return (
    <button style={{
      width: 26, height: 24, borderRadius: 4,
      fontSize: 12, color: 'var(--text-2)',
      fontFamily: 'var(--font-body)',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hi)'; e.currentTarget.style.color = 'var(--text)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
    >{children}</button>
  );
}

function RubricSlider({ criterion, onChange }) {
  const aiPct = (criterion.ai / criterion.max) * 100;
  const editedPct = (criterion.edited / criterion.max) * 100;
  const delta = criterion.edited - criterion.ai;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{criterion.name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          {Math.abs(delta) > 0.01 && (
            <span className="mono tnum" style={{
              fontSize: 10.5,
              color: delta > 0 ? 'var(--success)' : 'var(--warning)',
            }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
          <div className="mono tnum" style={{ fontSize: 12.5, color: 'var(--text)' }}>
            {criterion.edited.toFixed(1)} <span style={{ color: 'var(--text-3)' }}>/ {criterion.max.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${aiPct}%`, background: 'var(--text-3)', opacity: 0.35 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${editedPct}%`, background: 'var(--primary)', transition: 'width 160ms ease' }} />
      </div>
      <input
        type="range"
        min={0} max={criterion.max} step={0.1}
        value={criterion.edited}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', margin: '4px 0 0', accentColor: 'var(--primary)',
          height: 4, cursor: 'pointer',
        }}
      />
    </div>
  );
}

function Bar({ label, value, danger }) {
  const color = danger ? 'var(--danger)' : value >= 60 ? 'var(--warning)' : 'var(--success)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
        <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text)' }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 200ms ease' }} />
      </div>
    </div>
  );
}

function DashboardScreen({ showAlert, openDrawer: initialDrawer }) {
  const [activeDisc, setActiveDisc] = useStateD('all');
  const [openId, setOpenId] = useStateD(initialDrawer || null);

  useEffectD(() => { if (initialDrawer) setOpenId(initialDrawer); }, [initialDrawer]);

  const rows = activeDisc === 'all' ? SUBMISSIONS : SUBMISSIONS.filter(s => s.disc === activeDisc);
  const openRow = openId ? SUBMISSIONS.find(s => s.id === openId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <DiscPill code="Todas" active={activeDisc === 'all'} onClick={() => setActiveDisc('all')} />
          <DiscPill code="PARA-2026.1" active={activeDisc === 'PARA-2026.1'} onClick={() => setActiveDisc('PARA-2026.1')} />
          <DiscPill code="BIOQ-2026.1" active={activeDisc === 'BIOQ-2026.1'} onClick={() => setActiveDisc('BIOQ-2026.1')} />
          <DiscPill code="MICR-2026.1" active={activeDisc === 'MICR-2026.1'} onClick={() => setActiveDisc('MICR-2026.1')} />
          <DiscPill code="FARM-2026.1" active={activeDisc === 'FARM-2026.1'} onClick={() => setActiveDisc('FARM-2026.1')} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', height: 30,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, width: 260,
          color: 'var(--text-3)', fontSize: 12.5,
        }}>
          {ProfIcon.search}
          <span style={{ flex: 1 }}>Buscar trabalhos, alunos…</span>
          <span className="mono" style={{
            fontSize: 10.5, padding: '1px 5px', borderRadius: 3,
            background: 'var(--surface-hi)', border: '1px solid var(--border)',
          }}>⌘K</span>
        </div>
        <button className="btn">Últimos 7 dias {ProfIcon.chevD}</button>
        <button className="btn btn-primary">Processar pendentes (3)</button>
      </div>

      {/* Alert banner */}
      {showAlert && (
        <div className="fade-in" style={{
          padding: '10px 18px',
          background: 'rgba(239,68,68,0.06)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="dot dot-danger" style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }} />
          <div style={{ fontSize: 12.5, color: 'var(--text)', flex: 1 }}>
            <b style={{ fontWeight: 600 }}>Similaridade detectada</b>
            <span style={{ color: 'var(--text-2)' }}> — 2 grupos da PARA-2026.1 com 78% de sobreposição textual.</span>
          </div>
          <button className="btn btn-sm" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>Ver comparação</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}>{ProfIcon.close}</button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <KPI label="Total enviados" value="147" delta="+23 hoje" deltaPos />
        <KPI label="Aguardando IA" value="3" delta="fila · ~4min" />
        <KPI label="Pendentes revisão" value="11" delta="+2 desde ontem" />
        <KPI label="Média da turma" value="7.8" delta="PARA-2026.1" mono />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 110px 80px 100px 110px',
          padding: '0 16px',
          height: 32,
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          position: 'sticky', top: 0, zIndex: 1,
          fontSize: 11,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}>
          <div>Status</div>
          <div>Alunos</div>
          <div>Disciplina</div>
          <div>Enviado</div>
          <div>Nota IA</div>
          <div style={{ textAlign: 'right' }}>Ação</div>
        </div>
        {rows.map(row => (
          <SubmissionRow key={row.id} row={row} onOpen={setOpenId} isOpen={openId === row.id} />
        ))}
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px',
        borderTop: '1px solid var(--border)',
        fontSize: 11.5, color: 'var(--text-3)',
      }}>
        <span>Mostrando <span className="mono tnum" style={{ color: 'var(--text-2)' }}>1–10</span> de <span className="mono tnum" style={{ color: 'var(--text-2)' }}>147</span></span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm">Anterior</button>
        <button className="btn btn-ghost btn-sm">Próxima</button>
      </div>

      {openRow && <DetailDrawer row={openRow} onClose={() => setOpenId(null)} />}
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
