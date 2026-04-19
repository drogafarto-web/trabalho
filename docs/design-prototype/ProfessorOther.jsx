// ProfessorOther.jsx — Disciplinas, Alunos, Reports, Login screens

const { useState: useS, useEffect: useE } = React;

// ───────────────────────────────────────────────────────────
// DISCIPLINAS
// ───────────────────────────────────────────────────────────
const DISCIPLINES = [
  { code: 'PARA-2026.1', name: 'Parasitologia Clínica',   course: 'Farmácia',    crits: 5, alunos: 48, entregas: 23 },
  { code: 'BIOQ-2026.1', name: 'Bioquímica Aplicada',     course: 'Biomedicina', crits: 4, alunos: 36, entregas: 18 },
  { code: 'MICR-2026.1', name: 'Microbiologia Médica',    course: 'Biomedicina', crits: 6, alunos: 42, entregas: 31 },
  { code: 'FARM-2026.1', name: 'Farmacologia II',         course: 'Farmácia',    crits: 5, alunos: 52, entregas: 14 },
  { code: 'HEMA-2025.2', name: 'Hematologia Clínica',     course: 'Biomedicina', crits: 4, alunos: 38, entregas: 52, archived: true },
  { code: 'BROM-2025.2', name: 'Bromatologia',            course: 'Farmácia',    crits: 3, alunos: 44, entregas: 44, archived: true },
];

function DisciplineCard({ d, onOpen }) {
  const [hover, setHover] = useS(false);
  return (
    <div
      className="card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 16, position: 'relative',
        transition: 'border-color 120ms ease',
        borderColor: hover ? 'var(--border-hi)' : 'var(--border)',
        opacity: d.archived ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.code}</div>
        {d.archived && <span className="pill" style={{ fontSize: 10 }}>arquivada</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
        {d.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{d.course} · 2026.1</div>

      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        <span className="pill"><span className="mono tnum">{d.crits}</span> critérios</span>
        <span className="pill"><span className="mono tnum">{d.alunos}</span> alunos</span>
        <span className="pill"><span className="mono tnum">{d.entregas}</span> entregas</span>
      </div>

      <div style={{
        display: 'flex', gap: 2, marginTop: 14,
        paddingTop: 12, borderTop: '1px solid var(--border)',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onOpen}>Editar rubrica</button>
        <button className="btn btn-ghost btn-sm">Alunos</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" style={{ width: 26, padding: 0 }}>{ProfIcon.dots}</button>
      </div>
    </div>
  );
}

function DisciplineModal({ onClose, initialTab = 0 }) {
  const [tab, setTab] = useS(initialTab);
  const tabs = ['Info', 'Rubrica', 'Perguntas', 'Regras custom'];
  const [criteria, setCriteria] = useS([
    { name: 'Fundamentação teórica',    desc: 'Uso adequado de referências e conceitos',   peso: 2.5 },
    { name: 'Clareza e argumentação',   desc: 'Coerência, coesão e linguagem acadêmica',   peso: 2.0 },
    { name: 'Análise crítica do caso',  desc: 'Profundidade da discussão do caso clínico', peso: 2.5 },
    { name: 'Referências (ABNT)',       desc: 'Formatação e adequação das citações',       peso: 1.5 },
    { name: 'Originalidade',            desc: 'Contribuição autoral, além da compilação',  peso: 1.5 },
  ]);
  const pesoTotal = criteria.reduce((s, c) => s + c.peso, 0);
  const pesoOk = Math.abs(pesoTotal - 10) < 0.01;

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20 }} />
      <div className="fade-in" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 720, maxHeight: '86%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: 'var(--shadow-lg)',
        zIndex: 21,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
              Parasitologia Clínica
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              PARA-2026.1 · Editando
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={onClose}>{ProfIcon.close}</button>
        </div>

        <div style={{ display: 'flex', gap: 2, padding: '8px 14px 0', borderBottom: '1px solid var(--border)' }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '8px 12px', fontSize: 12.5,
                color: tab === i ? 'var(--text)' : 'var(--text-3)',
                borderBottom: `2px solid ${tab === i ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'all 120ms',
              }}
            >{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 0 && (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
              <InfoField label="Nome" value="Parasitologia Clínica" />
              <InfoField label="Código" value="PARA-2026.1" mono />
              <InfoField label="Curso" value="Farmácia" />
              <InfoField label="Período" value="4º período" />
              <InfoField label="Ano" value="2026" mono />
              <InfoField label="Semestre" value="1º" mono />
            </div>
          )}

          {tab === 1 && (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '18px 1fr 1.4fr 90px 32px',
                padding: '0 4px 8px', fontSize: 11, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <div></div>
                <div>Nome</div>
                <div>Descrição</div>
                <div style={{ textAlign: 'right' }}>Peso</div>
                <div></div>
              </div>
              {criteria.map((c, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '18px 1fr 1.4fr 90px 32px',
                  gap: 8, alignItems: 'center',
                  padding: '8px 4px',
                  borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ color: 'var(--text-3)', cursor: 'grab', display: 'flex', justifyContent: 'center' }}>
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/></svg>
                  </div>
                  <input className="input" style={{ height: 30, fontSize: 12.5 }} defaultValue={c.name} />
                  <input className="input" style={{ height: 30, fontSize: 12.5 }} defaultValue={c.desc} />
                  <input
                    className="input mono tnum"
                    style={{ height: 30, fontSize: 12.5, textAlign: 'right' }}
                    value={c.peso.toFixed(1)}
                    onChange={e => setCriteria(criteria.map((x, j) => j === i ? { ...x, peso: parseFloat(e.target.value) || 0 } : x))}
                  />
                  <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0, color: 'var(--text-3)' }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 3h7M4.5 3V2a1 1 0 011-1h0a1 1 0 011 1v1M3 3v6a1 1 0 001 1h3a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-sm">{ProfIcon.plus} Adicionar critério</button>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11.5, color: pesoOk ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {pesoOk ? <>{ProfIcon.check} Soma dos pesos</> : <>⚠ Soma dos pesos</>}
                  <span className="mono tnum" style={{ color: 'var(--text)' }}>{pesoTotal.toFixed(1)} / 10.0</span>
                </div>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div>
              {['Descreva o ciclo biológico do agente etiológico.',
                'Apresente o método diagnóstico de escolha e justifique.',
                'Discuta o tratamento de primeira linha e possíveis contraindicações.',
                'Analise o caso clínico fornecido identificando os pontos críticos.'].map((q, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--border)',
                }}>
                  <div style={{ color: 'var(--text-3)', cursor: 'grab' }}>
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/></svg>
                  </div>
                  <div className="mono tnum" style={{ fontSize: 11, color: 'var(--text-3)', width: 18 }}>{i + 1}.</div>
                  <input className="input" style={{ height: 32, fontSize: 13 }} defaultValue={q} />
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}>{ProfIcon.close}</button>
                </div>
              ))}
              <button className="btn btn-sm" style={{ marginTop: 10 }}>{ProfIcon.plus} Adicionar pergunta</button>
            </div>
          )}

          {tab === 3 && (
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.55 }}>
                Instruções adicionais injetadas no system prompt do Gemini. Use para orientar critério específico desta aula — citações obrigatórias, tópicos que devem aparecer, tom esperado.
              </div>
              <textarea
                className="textarea mono"
                style={{ minHeight: 180, fontSize: 12, lineHeight: 1.7 }}
                defaultValue={`- Exigir citação de pelo menos uma referência do Neves (Parasitologia Humana, 13ª ed.)\n- Penalizar parágrafos com >4 linhas sem citação\n- Aceitar nomenclatura científica em itálico ou sublinhado\n- Não penalizar uso de IA para revisão gramatical, apenas para redação autoral`}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 10, fontSize: 11, color: 'var(--text-3)',
              }}>
                <span>Contador: <span className="mono tnum" style={{ color: 'var(--text-2)' }}>186</span> tokens</span>
                <button className="btn btn-ghost btn-sm">Ver system prompt completo</button>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8,
        }}>
          <button className="btn btn-ghost">Excluir disciplina</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary">Salvar alterações</button>
        </div>
      </div>
    </>
  );
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className={`input ${mono ? 'mono' : ''}`} defaultValue={value} />
    </div>
  );
}

function DisciplinasScreen({ modalInitialTab }) {
  const [modal, setModal] = useS(modalInitialTab !== undefined);
  useE(() => { if (modalInitialTab !== undefined) setModal(true); }, [modalInitialTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Disciplinas</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            <span className="mono tnum">4</span> ativas · <span className="mono tnum">2</span> arquivadas
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn">Importar de 2025.2</button>
        <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => setModal(true)}>
          {ProfIcon.plus} Nova disciplina
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Semestre atual
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {DISCIPLINES.filter(d => !d.archived).map(d => (
            <DisciplineCard key={d.code} d={d} onOpen={() => setModal(true)} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '28px 0 10px' }}>
          Arquivadas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {DISCIPLINES.filter(d => d.archived).map(d => (
            <DisciplineCard key={d.code} d={d} onOpen={() => setModal(true)} />
          ))}
        </div>
      </div>

      {modal && <DisciplineModal onClose={() => setModal(false)} initialTab={modalInitialTab ?? 1} />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// ALUNOS
// ───────────────────────────────────────────────────────────
const ALUNOS_LIST = [
  ['Ana Matoso',              'ana.matoso@fmu.br',          6],
  ['Beatriz Camargo Lins',    'beatriz.lins@fmu.br',        4],
  ['Camila Andrade',          'camila.andrade@fmu.br',      5],
  ['Carla Nunes',             'carla.nunes@fmu.br',         3],
  ['Diego Ramos',             '—',                          3],
  ['Fernanda Brito',          'fbrito@fmu.br',              5],
  ['Gabriel Teles',           'gabriel.teles@fmu.br',       4],
  ['Henrique Salles',         'h.salles@fmu.br',            2],
  ['Lara Sato',               'lara.sato@fmu.br',           3],
  ['Luana Peretto',           '—',                          5],
  ['Matheus Okada',           'matheus.okada@fmu.br',       4],
  ['Nathalia Khouri',         'nathalia.khouri@fmu.br',     6],
];

function AlunosScreen({ emptyState, importOpen }) {
  const [disc, setDisc] = useS('PARA-2026.1');
  const [showImport, setShowImport] = useS(importOpen);
  useE(() => setShowImport(importOpen), [importOpen]);

  const isEmpty = emptyState;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Alunos</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Lista por disciplina · alimenta o autocomplete do formulário
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['PARA-2026.1', 'BIOQ-2026.1', 'MICR-2026.1', 'FARM-2026.1'].map(c => (
            <DiscPill key={c} code={c} active={disc === c} onClick={() => setDisc(c)} />
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          <span className="mono tnum" style={{ color: 'var(--text-2)' }}>{isEmpty ? 0 : ALUNOS_LIST.length}</span> alunos
        </div>
        <button className="btn btn-sm">Exportar CSV</button>
        <button className="btn btn-sm" onClick={() => setShowImport(true)}>Importar lista</button>
        <button className="btn btn-primary btn-sm">{ProfIcon.plus} Adicionar aluno</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isEmpty ? (
          <div style={{
            padding: '80px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 19c0-3.8 3-6 7-6s7 2.2 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
              Nenhum aluno cadastrado
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '6px 0 20px', maxWidth: 380, marginInline: 'auto', lineHeight: 1.55 }}>
              Importe a lista de matriculados para que os alunos apareçam no autocomplete do formulário de entrega.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowImport(true)}>Importar lista</button>
              <button className="btn btn-primary">Adicionar manualmente</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.4fr 140px 100px',
              padding: '0 24px', height: 32, alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
              position: 'sticky', top: 0,
              fontSize: 11, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <div>Nome</div>
              <div>Email</div>
              <div>Presente em</div>
              <div style={{ textAlign: 'right' }}>Ação</div>
            </div>
            {ALUNOS_LIST.map(([name, email, count], i) => (
              <AlunoRow key={i} name={name} email={email} count={count} />
            ))}
          </>
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function AlunoRow({ name, email, count }) {
  const [hover, setHover] = useS(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr 140px 100px',
        alignItems: 'center',
        padding: '0 24px', height: 40,
        borderBottom: '1px solid var(--border)',
        background: hover ? 'rgba(255,255,255,0.015)' : 'transparent',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{name}</div>
      <div className={email === '—' ? '' : 'mono'} style={{ fontSize: 12, color: email === '—' ? 'var(--text-3)' : 'var(--text-2)' }}>{email}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
        <span className="mono tnum">{count}</span> <span style={{ color: 'var(--text-3)' }}>entregas</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {hover && (
          <div className="fade-in" style={{ display: 'flex', gap: 2 }}>
            <button className="btn btn-ghost btn-sm">Editar</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}>{ProfIcon.close}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportModal({ onClose }) {
  const [tab, setTab] = useS(0);
  const [text, setText] = useS(`Ana Matoso
Beatriz Camargo Lins
Carla Nunes
Diego Ramos

Fernanda Brito
  Gabriel Teles
Henrique Salles
Lara Sato
Luana Peretto`);
  const names = text.split('\n').map(l => l.trim()).filter(Boolean);
  const existing = ['Ana Matoso', 'Carla Nunes'];
  const novos = names.filter(n => !existing.includes(n));
  const jaExistem = names.filter(n => existing.includes(n));

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20 }} />
      <div className="fade-in" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 580, background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: 'var(--shadow-lg)',
        zIndex: 21,
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>Importar lista de alunos</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>PARA-2026.1 · Parasitologia Clínica</div>
          </div>
          <button className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={onClose}>{ProfIcon.close}</button>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: '8px 14px 0', borderBottom: '1px solid var(--border)' }}>
          {['Colar texto', 'Enviar CSV'].map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              padding: '8px 12px', fontSize: 12.5,
              color: tab === i ? 'var(--text)' : 'var(--text-3)',
              borderBottom: `2px solid ${tab === i ? 'var(--primary)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>
        <div style={{ padding: 18 }}>
          {tab === 0 ? (
            <>
              <textarea
                className="textarea mono"
                style={{ minHeight: 180, fontSize: 12.5, lineHeight: 1.7 }}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <div style={{
                marginTop: 12, padding: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 12, color: 'var(--text-2)',
                display: 'flex', gap: 20,
              }}>
                <div>
                  <span className="mono tnum" style={{ color: 'var(--text)', fontSize: 14 }}>{names.length}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>detectados</span>
                </div>
                <div>
                  <span className="mono tnum" style={{ color: 'var(--success)', fontSize: 14 }}>{novos.length}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>novos</span>
                </div>
                <div>
                  <span className="mono tnum" style={{ color: 'var(--warning)', fontSize: 14 }}>{jaExistem.length}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>já existem</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              border: '1.5px dashed var(--border)', borderRadius: 10,
              padding: 32, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Arraste o CSV ou clique para selecionar</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>coluna obrigatória: nome · opcional: email</div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary">Importar {novos.length} alunos</button>
        </div>
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────
// REPORTS
// ───────────────────────────────────────────────────────────
const REPORT_STUDENTS = [
  { name: 'Beatriz Camargo Lins',  group: 'G-04', scores: [2.0, 1.8, 2.2, 1.2, 1.2], final: 8.4 },
  { name: 'Matheus Okada',         group: 'G-04', scores: [2.0, 1.8, 2.2, 1.2, 1.2], final: 8.4 },
  { name: 'Carla Nunes',           group: 'G-07', scores: [1.5, 1.4, 1.7, 1.0, 1.5], final: 7.1 },
  { name: 'Diego Ramos',           group: 'G-07', scores: [1.5, 1.4, 1.7, 1.0, 1.5], final: 7.1 },
  { name: 'Lara Sato',             group: 'G-07', scores: [1.5, 1.4, 1.7, 1.0, 1.5], final: 7.1 },
  { name: 'Yasmin Cardoso',        group: 'G-11', scores: [2.4, 1.9, 2.4, 1.3, 1.2], final: 9.2 },
  { name: 'Gabriel Teles',         group: 'G-11', scores: [2.4, 1.9, 2.4, 1.3, 1.2], final: 9.2 },
  { name: 'Paula Bianchi',         group: 'G-03', scores: [1.2, 1.3, 1.8, 0.8, 1.2], final: 6.3 },
  { name: 'Fernanda Brito',        group: 'G-09', scores: [1.0, 1.2, 1.5, 1.0, 1.0], final: 5.7 },
  { name: 'Luana Peretto',         group: 'G-02', scores: [2.5, 2.0, 2.5, 1.4, 1.2], final: 9.6 },
];
const CRITERIA_LABELS = ['Fundamentação', 'Clareza', 'Análise', 'ABNT', 'Originalidade'];
const CRITERIA_MAX = [2.5, 2.0, 2.5, 1.5, 1.5];

function ReportsScreen({ view: initialView }) {
  const [view, setView] = useS(initialView || 'aluno');
  useE(() => { if (initialView) setView(initialView); }, [initialView]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Relatórios</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>PARA-2026.1 · Parasitologia Clínica · 2026.1</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn">Imprimir</button>
        <button className="btn" style={{ marginLeft: 8 }}>Baixar Excel</button>
        <button className="btn btn-primary" style={{ marginLeft: 8 }}>Exportar para diário</button>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
      }}>
        <button className="btn btn-sm">PARA-2026.1 {ProfIcon.chevD}</button>
        <button className="btn btn-sm">Todos períodos {ProfIcon.chevD}</button>
        <button className="btn btn-sm">Publicadas {ProfIcon.chevD}</button>
        <div style={{ flex: 1 }} />
        <div className="tweak-seg" style={{ border: '1px solid var(--border)' }}>
          {[['aluno', 'Por aluno'], ['grupo', 'Por grupo'], ['criterio', 'Por critério']].map(([k, l]) => (
            <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'aluno' && <ReportByStudent />}
        {view === 'grupo' && <ReportByGroup />}
        {view === 'criterio' && <ReportHeatmap />}
      </div>
    </div>
  );
}

function ReportByStudent() {
  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px',
        padding: '0 24px', height: 32, alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: 'var(--bg)', position: 'sticky', top: 0,
      }}>
        <div>Aluno</div>
        <div>Grupo</div>
        <div>Nota</div>
        <div>Status</div>
      </div>
      {REPORT_STUDENTS.map((s, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px',
          padding: '0 24px', height: 38, alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{s.name}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{s.group}</div>
          <div><GradeBadge grade={s.final} /></div>
          <div><StatusTag status="ok" /></div>
        </div>
      ))}
    </>
  );
}

function ReportByGroup() {
  const groups = [...new Set(REPORT_STUDENTS.map(s => s.group))];
  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(g => {
        const members = REPORT_STUDENTS.filter(s => s.group === g);
        return (
          <div key={g} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', width: 50 }}>{g}</div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                {members.map(m => m.name).join(' · ')}
              </div>
              <GradeBadge grade={members[0].final} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportHeatmap() {
  const cellColor = (v, max) => {
    const pct = v / max;
    if (pct >= 0.9) return 'rgba(16,185,129,0.35)';
    if (pct >= 0.7) return 'rgba(59,130,246,0.28)';
    if (pct >= 0.5) return 'rgba(245,158,11,0.25)';
    return 'rgba(239,68,68,0.22)';
  };
  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `200px repeat(${CRITERIA_LABELS.length}, 1fr) 70px`,
        gap: 4, alignItems: 'center',
      }}>
        <div></div>
        {CRITERIA_LABELS.map((l, i) => (
          <div key={i} style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
            {l}
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Final</div>

        {REPORT_STUDENTS.map((s, si) => (
          <React.Fragment key={si}>
            <div style={{ fontSize: 12.5, color: 'var(--text)', paddingRight: 12 }}>{s.name}</div>
            {s.scores.map((sc, ci) => (
              <div key={ci} style={{
                height: 30,
                background: cellColor(sc, CRITERIA_MAX[ci]),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4,
              }}>
                <span className="mono tnum" style={{ fontSize: 11.5, color: 'var(--text)' }}>{sc.toFixed(1)}</span>
              </div>
            ))}
            <div style={{ textAlign: 'right' }}><GradeBadge grade={s.final} /></div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────────────────
function LoginScreen({ unauthorized }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 24,
      background: 'var(--bg)',
    }}>
      <div style={{ width: 400, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #fafafa, #a1a1aa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          color: '#09090B', fontWeight: 700, fontSize: 22,
          fontFamily: 'var(--font-display)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>c</div>

        <div className="card" style={{ padding: '28px 28px 24px', textAlign: 'left' }}>
          {unauthorized ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="dot dot-danger" style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
                  Acesso não autorizado
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>
                Sua conta Google foi autenticada, mas não está cadastrada como professora nesta instituição. Solicite acesso ao administrador.
              </div>
              <div className="card mono" style={{
                padding: 10, fontSize: 11.5,
                background: 'var(--bg)', border: '1px solid var(--border)',
                marginBottom: 16,
              }}>
                <div style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Contato admin</div>
                <div style={{ color: 'var(--text)' }}>admin@controle.ia</div>
              </div>
              <button className="btn btn-full">Sair e tentar outra conta</button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                Acesso restrito
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 22 }}>
                Apenas professores cadastrados. Autenticação via Google institucional.
              </div>
              <button className="btn btn-full btn-lg" style={{
                background: '#fff', color: '#111', border: '1px solid #fff',
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 009 18z"/><path fill="#FBBC05" d="M3.96 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.28-1.72V4.95H.93A9 9 0 000 9c0 1.45.35 2.82.93 4.05l3.03-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 009 0 9 9 0 00.93 4.95l3.03 2.33C4.67 5.16 6.65 3.58 9 3.58z"/></svg>
                Entrar com Google
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--text-3)' }}>
          <a href="#aluno" style={{ color: 'var(--text-2)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
            Sou aluno, quero entregar trabalho →
          </a>
        </div>
      </div>
    </div>
  );
}

window.DisciplinasScreen = DisciplinasScreen;
window.AlunosScreen = AlunosScreen;
window.ReportsScreen = ReportsScreen;
window.LoginScreen = LoginScreen;
