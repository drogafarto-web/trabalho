// StudentForm.jsx — Mobile-first, 3-step submission flow

const { useState, useEffect, useRef } = React;

function StepStepper({ step }) {
  const steps = ['Identificação', 'Arquivo', 'Confirmar'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px 4px' }}>
      {steps.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                background: active ? 'var(--primary)' : done ? 'var(--surface-hi)' : 'var(--surface)',
                color: active ? '#fff' : done ? 'var(--text)' : 'var(--text-3)',
                border: `1px solid ${active ? 'var(--primary)' : done ? 'var(--border-hi)' : 'var(--border)'}`,
                fontFamily: 'var(--font-mono)',
                transition: 'all 180ms ease',
              }}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : i + 1}
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : done ? 'var(--text-2)' : 'var(--text-3)',
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 0.4, height: 1, marginRight: 4,
                background: done ? 'var(--border-hi)' : 'var(--border)',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function DisciplineSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { code: 'PARA-2026.1', name: 'Parasitologia Clínica', meta: 'Farmácia · 4º período' },
    { code: 'BIOQ-2026.1', name: 'Bioquímica Aplicada', meta: 'Biomedicina · 3º período' },
    { code: 'MICR-2026.1', name: 'Microbiologia Médica', meta: 'Biomedicina · 5º período' },
    { code: 'FARM-2026.1', name: 'Farmacologia II', meta: 'Farmácia · 6º período' },
  ];
  const sel = options.find(o => o.code === value);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textAlign: 'left', cursor: 'pointer', height: 44,
        }}
      >
        <div>
          {sel ? (
            <div>
              <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{sel.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sel.code}</div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-3)' }}>Selecione a disciplina</span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <path d="M3 5.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="fade-in" style={{
          position: 'absolute', top: 48, left: 0, right: 0, zIndex: 10,
          background: 'var(--surface-hi)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)',
          padding: 4, maxHeight: 280, overflow: 'auto',
        }}>
          <div style={{ padding: '6px 10px 4px' }}>
            <input placeholder="Buscar disciplina…" className="input" style={{ height: 32, fontSize: 12.5 }} autoFocus />
          </div>
          {options.map(o => (
            <button
              key={o.code}
              onClick={() => { onChange(o.code); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 5,
                background: o.code === value ? 'rgba(59,130,246,0.08)' : 'transparent',
              }}
              onMouseEnter={e => { if (o.code !== value) e.currentTarget.style.background = 'var(--border)'; }}
              onMouseLeave={e => { if (o.code !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{o.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8 }}>
                <span className="mono">{o.code}</span>
                <span>·</span>
                <span>{o.meta}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({ name, onRemove, canRemove, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          className="input"
          value={name}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder="Digite seu nome…"
          style={{ height: 40, paddingLeft: 36 }}
        />
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-3)' }}>
          <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M2.5 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
      {canRemove && (
        <button className="btn btn-ghost" style={{ height: 40, width: 40, padding: 0 }} onClick={onRemove}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );
}

function Dropzone({ state, onStateChange, fileName, progress }) {
  // state: 'idle' | 'dragging' | 'uploading' | 'success' | 'error'
  const borderColor = {
    idle: 'var(--border)',
    dragging: 'var(--primary)',
    uploading: 'var(--border-hi)',
    success: 'var(--success)',
    error: 'var(--danger)',
  }[state];

  const bg = {
    idle: 'var(--surface)',
    dragging: 'rgba(59,130,246,0.05)',
    uploading: 'var(--surface)',
    success: 'rgba(16,185,129,0.03)',
    error: 'rgba(239,68,68,0.04)',
  }[state];

  return (
    <div style={{
      border: `1.5px dashed ${borderColor}`,
      borderRadius: 10,
      background: bg,
      padding: 20,
      minHeight: 220,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
      transition: 'all 160ms ease',
      position: 'relative',
    }}>
      {state === 'idle' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--surface-hi)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 13V3m0 0l-3.5 3.5M10 3l3.5 3.5" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 13v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            Toque para selecionar ou arraste
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
            PDF, JPG ou PNG · até 45MB
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => onStateChange('uploading')}
          >
            Escolher arquivo
          </button>
        </div>
      )}

      {state === 'uploading' && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <FileIcon type="pdf" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileName}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                Enviando… <span style={{ color: 'var(--text-2)' }}>{progress}%</span>
              </div>
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--surface-hi)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--primary)',
              transition: 'width 300ms ease',
            }} />
          </div>
        </div>
      )}

      {state === 'success' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
          <FileIcon type="pdf" state="ok" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{fileName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              2.4 MB · Anexado
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onStateChange('idle')}>Trocar</button>
        </div>
      )}

      {state === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v5M10 14.5v.5" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="10" cy="10" r="8" stroke="var(--danger)" strokeWidth="1.4"/>
            </svg>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            Falha no envio
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>
            Conexão interrompida. O arquivo não foi perdido.
          </div>
          <button className="btn btn-sm" onClick={() => onStateChange('uploading')}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6a5 5 0 0 1 9-3M11 6a5 5 0 0 1-9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 1v2.5H7.5M2 11V8.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

function FileIcon({ type = 'pdf', state }) {
  const color = state === 'ok' ? 'var(--success)' : type === 'pdf' ? 'var(--danger)' : 'var(--primary)';
  const label = type.toUpperCase();
  return (
    <div style={{
      width: 36, height: 44, borderRadius: 4,
      border: `1px solid ${color}`,
      background: `${color}15`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: 4, flexShrink: 0, position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 10, height: 10,
        background: 'var(--surface-hi)',
        borderLeft: `1px solid ${color}`,
        borderBottom: `1px solid ${color}`,
        borderBottomLeftRadius: 3,
      }} />
      <span className="mono" style={{ fontSize: 9, fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

function SuccessAnim() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle
        cx="32" cy="32" r="27"
        stroke="var(--success)" strokeWidth="2.5"
        strokeDasharray="170" strokeDashoffset="0"
        style={{ animation: 'drawCircle 420ms ease-out both' }}
      />
      <path
        d="M20 33l9 9 16-18"
        stroke="var(--success)" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="50" strokeDashoffset="0"
        style={{ animation: 'drawSuccess 360ms 200ms ease-out both' }}
      />
    </svg>
  );
}

function StudentFormScreen({ forcedState, forcedStep }) {
  const [step, setStep] = useState(forcedStep ?? 0);
  const [disc, setDisc] = useState('PARA-2026.1');
  const [me, setMe] = useState('Beatriz Camargo Lins');
  const [members, setMembers] = useState([]);
  const [whatsapp, setWhatsapp] = useState('(11) 98421-3390');
  const [email, setEmail] = useState('beatriz.lins@fmu.br');
  const [fileState, setFileState] = useState(forcedState ?? 'success');
  const [progress, setProgress] = useState(100);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (forcedStep !== undefined) setStep(forcedStep);
  }, [forcedStep]);

  useEffect(() => {
    if (forcedState !== undefined) {
      setFileState(forcedState);
      if (forcedState === 'uploading') setProgress(42);
      if (forcedState === 'success') setProgress(100);
    }
  }, [forcedState]);

  useEffect(() => {
    if (fileState === 'uploading' && progress < 100) {
      const t = setTimeout(() => {
        setProgress(p => {
          const next = Math.min(100, p + 7);
          if (next === 100) setFileState('success');
          return next;
        });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [fileState, progress]);

  const addMember = () => {
    if (members.length < 2) setMembers([...members, '']);
  };

  const protocolId = 'TRB-2K6A-7F3';

  if (submitted) {
    return (
      <div style={{ padding: '28px 24px 36px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <SuccessAnim />
        </div>
        <h2 style={{ fontSize: 22, marginTop: 18, color: 'var(--text)' }}>Entrega confirmada</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '8px 0 28px', lineHeight: 1.5 }}>
          Seu trabalho foi recebido e entrou na fila de correção automática. Você e seus colegas receberão a nota por email.
        </p>
        <div className="card" style={{ padding: 14, textAlign: 'left', marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Protocolo
          </div>
          <div className="mono" style={{ fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
            {protocolId}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8 }}>
            Guarde este código. Imprima ou tire um print.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setSubmitted(false); setStep(0); }}>
          Nova entrega
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-mark" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>
              Entrega de Trabalho
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>2026.1</div>
        </div>
        <StepStepper step={step} />
      </div>

      <div style={{ flex: 1, padding: '18px 20px 22px', overflow: 'auto' }}>
        {step === 0 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Disciplina</label>
              <DisciplineSelect value={disc} onChange={setDisc} />
            </div>
            <div>
              <label className="label">Meu nome</label>
              <MemberRow name={me} canRemove={false} onChange={setMe} />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                Autocomplete puxa da lista de alunos da disciplina
              </div>
            </div>
            {members.length > 0 && (
              <div>
                <label className="label">Colegas do grupo</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map((m, i) => (
                    <MemberRow
                      key={i} name={m} canRemove
                      onChange={v => setMembers(members.map((mm, j) => j === i ? v : mm))}
                      onRemove={() => setMembers(members.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </div>
            )}
            {members.length < 2 && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addMember}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Adicionar colega ({members.length}/2)
              </button>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" style={{ height: 40 }} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              </div>
              <div>
                <label className="label">Email institucional</label>
                <input className="input" style={{ height: 40 }} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>Anexar trabalho</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                Um único arquivo com todas as perguntas respondidas.
              </div>
            </div>
            <Dropzone
              state={fileState}
              onStateChange={(s) => { setFileState(s); if (s === 'uploading') setProgress(0); }}
              fileName="parasito-trabalho-grupo-beatriz.pdf"
              progress={progress}
            />
            {fileState === 'success' && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: 12, borderRadius: 8,
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <div style={{ width: 16, height: 16, marginTop: 1 }}>
                  <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--success)" strokeWidth="1.3"/><path d="M5 8l2 2 4-5" stroke="var(--success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Texto legível detectado nas primeiras páginas. OCR será executado no envio.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Revise antes de enviar
              </div>
              <ReviewRow label="Disciplina" value="Parasitologia Clínica" sub="PARA-2026.1" />
              <ReviewRow label="Aluno" value={me} />
              {members.filter(m => m).map((m, i) => <ReviewRow key={i} label={i === 0 ? 'Colegas' : ''} value={m} />)}
              <ReviewRow label="Contato" value={whatsapp} sub={email} />
              <ReviewRow
                label="Arquivo"
                value="parasito-trabalho-grupo-beatriz.pdf"
                sub="2.4 MB · PDF"
                icon={<FileIcon type="pdf" state="ok" />}
                last
              />
            </div>
            <div style={{
              fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5,
              padding: '0 2px',
            }}>
              Ao enviar você confirma que este é trabalho original do grupo, seguindo o código de integridade acadêmica.
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 20px 14px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex', gap: 10,
      }}>
        {step > 0 && (
          <button className="btn" style={{ height: 44 }} onClick={() => setStep(step - 1)}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            Voltar
          </button>
        )}
        {step < 2 ? (
          <button
            className="btn btn-primary"
            style={{ flex: 1, height: 44 }}
            disabled={step === 1 && fileState !== 'success'}
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </button>
        ) : (
          <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => setSubmitted(true)}>
            Enviar trabalho
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, sub, icon, last }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: icon ? 'center' : 'flex-start',
      padding: '10px 0',
      borderBottom: last ? 0 : '1px solid var(--border)',
    }}>
      {icon}
      <div style={{ width: 72, fontSize: 11.5, color: 'var(--text-3)', paddingTop: 1 }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{value}</div>
        {sub && <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

window.StudentFormScreen = StudentFormScreen;
