// ProfessorShell.jsx — Shared sidebar + shell for professor screens

const Icon = {
  trabalhos: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 3a1 1 0 011-1h5.5l3 3V12a1 1 0 01-1 1h-7.5a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7h5M5 9.5h3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  disciplinas: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M2 6h11" stroke="currentColor" strokeWidth="1.2"/><path d="M5 2v2M10 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  alunos: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.2"/><path d="M3 12.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  relatorios: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 12V6M7.5 12V3M12 12V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  config: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 1.5v1.5M7.5 12v1.5M13.5 7.5H12M3 7.5H1.5M11.7 3.3l-1.1 1.1M4.4 10.6l-1.1 1.1M11.7 11.7l-1.1-1.1M4.4 4.4L3.3 3.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  search: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  plus: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  chevD: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dots: <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/></svg>,
  close: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function Sidebar({ active, onNav }) {
  const items = [
    { id: 'dashboard', label: 'Trabalhos', icon: Icon.trabalhos, count: 23 },
    { id: 'disciplinas', label: 'Disciplinas', icon: Icon.disciplinas },
    { id: 'alunos', label: 'Alunos', icon: Icon.alunos },
    { id: 'reports', label: 'Relatórios', icon: Icon.relatorios },
    { id: 'config', label: 'Configurações', icon: Icon.config },
  ];
  return (
    <aside style={{
      width: 240, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 16px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg, #fafafa, #a1a1aa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#09090B', fontWeight: 700, fontSize: 13,
          fontFamily: 'var(--font-display)',
        }}>c</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
            controle<span style={{ color: 'var(--text-3)' }}>.ia</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>Prof. R. Moraes</div>
        </div>
        <button className="btn btn-ghost" style={{ width: 22, height: 22, padding: 0 }}>{Icon.chevD}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 4 }}>
        {items.map(it => (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              color: active === it.id ? 'var(--text)' : 'var(--text-2)',
              background: active === it.id ? 'var(--surface-hi)' : 'transparent',
              transition: 'all 100ms ease',
            }}
            onMouseEnter={e => { if (active !== it.id) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface)'; } }}
            onMouseLeave={e => { if (active !== it.id) { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'transparent'; } }}
          >
            <span style={{ color: active === it.id ? 'var(--text)' : 'var(--text-3)', display: 'flex' }}>{it.icon}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
            {it.count !== undefined && (
              <span className="mono" style={{
                fontSize: 10.5, color: 'var(--text-3)',
                background: 'var(--surface)', padding: '1px 6px', borderRadius: 4,
                border: '1px solid var(--border)',
              }}>{it.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '10px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span className="dot dot-success" style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.18)', animation: 'pulse 2s infinite' }} />
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Sincronizado</div>
        <div className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)' }}>v1.4.0</div>
      </div>
    </aside>
  );
}

window.ProfSidebar = Sidebar;
window.ProfIcon = Icon;
