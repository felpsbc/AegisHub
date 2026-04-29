// Shared components for AegisHub
const { Icon } = window;

function Avatar({ name, color, size = 'md' }) {
  const data = window.AH_DATA;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const c = color || data.hashColor(name);
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : 'avatar';
  return <span className={`${cls} av-${c}`}>{initials}</span>;
}

function Verified({ title = 'Pentester verificado pela AegisHub' }) {
  return (
    <span className="verified" title={title} aria-label={title}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1E40AF" aria-hidden="true">
        <path d="M12 2 L14.4 4.1 L17.5 3.7 L18.4 6.7 L21.2 8.2 L20.4 11.2 L21.7 14 L19.3 16 L19 19.1 L15.9 19.5 L14 22 L11.2 20.6 L8.4 22 L6.5 19.5 L3.4 19.1 L3.1 16 L0.7 14 L2 11.2 L1.2 8.2 L4 6.7 L4.9 3.7 L8 4.1 Z" fillOpacity="0.0"/>
        <circle cx="12" cy="12" r="9" fill="#1E40AF"/>
        <path d="M8 12.5 L11 15 L16.5 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </span>
  );
}

function StatusDot({ status }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={`dot ${status === 'open' ? 'dot-open' : 'dot-busy'}`}></span>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {status === 'open' ? 'Aberto a propostas' : 'Em projeto'}
      </span>
    </span>
  );
}

function Logo({ small = false }) {
  return (
    <span className="logo">
      <span className="logo-mark">
        {/* Original mark: an "A" formed by an aperture/triangle */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 13 L8 3 L13 13" stroke="white" strokeWidth="1.4" strokeLinecap="square"/>
          <path d="M5.5 9 L10.5 9" stroke="white" strokeWidth="1.4" strokeLinecap="square"/>
        </svg>
      </span>
      {!small && <span>aegishub</span>}
    </span>
  );
}

function Topbar({ route, navigate, account, setAccount, theme, setTheme }) {
  const data = window.AH_DATA;
  const inApp = route.startsWith('/app') || route === '/admin';
  const onCatalog = route.startsWith('/app/pentesters') || route.startsWith('/app/propostas');
  const catView = route.startsWith('/app/pentesters') ? 'pentesters' : 'propostas';

  const user =
    account === 'empresa' ? data.empresaUser :
    account === 'pentester' ? data.pentesterUser :
    data.adminUser;

  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <a href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <Logo />
        </a>

        {inApp && account !== 'admin' && (
          <div className="toggle" role="tablist" aria-label="Modo de visualização">
            <button
              className={catView === 'pentesters' ? 'active' : ''}
              onClick={() => navigate('/app/pentesters')}
            >Pentesters</button>
            <button
              className={catView === 'propostas' ? 'active' : ''}
              onClick={() => navigate('/app/propostas')}
            >Propostas</button>
          </div>
        )}

        {inApp && (
          <nav className="nav">
            <a href="#/app/dashboard"
               onClick={(e) => { e.preventDefault(); navigate('/app/dashboard'); }}
               className={route === '/app/dashboard' ? 'active' : ''}>Dashboard</a>
            {account === 'admin' && (
              <a href="#/admin"
                 onClick={(e) => { e.preventDefault(); navigate('/admin'); }}
                 className={route === '/admin' ? 'active' : ''}>Admin</a>
            )}
            <a href="#/app/perfil"
               onClick={(e) => { e.preventDefault(); navigate('/app/perfil'); }}
               className={route === '/app/perfil' ? 'active' : ''}>Perfil</a>
          </nav>
        )}

        <div className="spacer"></div>

        {!inApp && (
          <div className="row gap-2">
            <button
              className="btn-ghost"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}
              onClick={() => setTheme && setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
              title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
            >
              {theme === 'dark' ? <Icon.Sun size={15}/> : <Icon.Moon size={15}/>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Entrar</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/cadastro')}>Criar conta</button>
          </div>
        )}

        {inApp && (
          <div className="row gap-3">
            <button
              className="btn-ghost"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}
              onClick={() => setTheme && setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
              title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
            >
              {theme === 'dark' ? <Icon.Sun size={15}/> : <Icon.Moon size={15}/>}
            </button>
            <button className="btn-ghost" style={{ border: 'none', background: 'transparent', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6 }} aria-label="Notificações">
              <Icon.Bell size={16}/>
            </button>
            <button
              onClick={() => navigate('/app/perfil')}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
              aria-label="Conta"
            >
              <Avatar name={user.nome} color={user.color} size="sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PentesterCard({ p, onClick }) {
  return (
    <div className="pcard" onClick={onClick} role="button" tabIndex={0}>
      <span
        className={`dot ${p.status === 'open' ? 'dot-open' : 'dot-busy'} pcard-status`}
        title={p.status === 'open' ? 'Aberto a propostas' : 'Em projeto'}
      ></span>
      <div className="pcard-head">
        <Avatar name={p.nome} color={p.color} />
        <div style={{ minWidth: 0 }}>
          <div className="pcard-name">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
            {p.verificado && <Verified />}
          </div>
          <div className="pcard-spec">{p.specShort}</div>
        </div>
      </div>

      <div className="pcard-rate">
        <span className="rate-value">R$ {p.rate}</span>
        <span className="rate-unit">/h</span>
      </div>

      <div className="pcard-certs">
        {p.certs.slice(0, 4).map(c => <span key={c} className="badge">{c}</span>)}
      </div>

      <div className="pcard-foot">
        <span className="row" style={{ gap: 4 }}>
          <Icon.Star size={11} />
          <span style={{ color: 'var(--text)' }}>{p.rating.toFixed(1)}</span>
        </span>
        <span className="sep">·</span>
        <span>{p.projetos} projetos</span>
        <span className="sep">·</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cidade}</span>
      </div>
    </div>
  );
}

function PropostaCard({ pr, onClick }) {
  return (
    <div className="prcard" onClick={onClick} role="button" tabIndex={0}>
      <div>
        <div className="prcard-title">{pr.titulo}</div>
        <div className="prcard-meta">
          <span>{pr.empresa}</span>
          <span className="sep">·</span>
          <span>{pr.empresaTipo}</span>
          <span className="sep">·</span>
          <span>{pr.publicado}</span>
        </div>
      </div>
      <div className="prcard-side">
        <div className="prcard-budget">R$ {pr.budget.toLocaleString('pt-BR')}</div>
        <div className="prcard-prazo">{pr.prazo} · {pr.tipoTeste}</div>
      </div>
      <div className="prcard-tags">
        {pr.categorias.map(c => (
          <span key={c.label} className={`tag tag-${c.tone}`}>{c.label}</span>
        ))}
        <span className="tag tag-stone">{pr.candidaturas} candidaturas</span>
      </div>
    </div>
  );
}

function Toast({ msg, onDone }) {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

Object.assign(window, {
  Avatar, Verified, StatusDot, Logo, Topbar,
  PentesterCard, PropostaCard, Toast,
});
