// Landing, Login, Cadastro
const { Icon } = window;

function Landing({ navigate, setAccount }) {
  return (
    <div>
      <div className="container hero">
        <h1>Pentest sob demanda. Direto com quem invade.</h1>
        <p className="hero-sub">
          Marketplace que liga empresas a profissionais de pentest verificados.
          Sem intermediário comercial, sem RFP de 60 dias. Você publica o escopo, recebe candidaturas, contrata.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => { setAccount('empresa'); navigate('/app/pentesters'); }}>
            Sou empresa <Icon.ArrowRight />
          </button>
          <button className="btn btn-lg" onClick={() => { setAccount('pentester'); navigate('/app/propostas'); }}>
            Sou pentester <Icon.ArrowRight />
          </button>
        </div>
        <div className="row gap-4 mt-6" style={{ color: 'var(--text-2)', fontSize: 13 }}>
          <span className="row" style={{ gap: 6 }}><Icon.Shield size={13}/> NDA padrão da plataforma</span>
          <span className="row" style={{ gap: 6 }}><Icon.CheckBadge size={13}/> Selo azul para certificações</span>
          <span className="row" style={{ gap: 6 }}><Icon.DollarSign size={13}/> Pagamento em escrow</span>
        </div>
      </div>

      <div className="container duo">
        <div className="duo-card">
          <span className="duo-eyebrow">Para empresas</span>
          <span className="duo-title">Encontre o ofensivo certo em horas, não em meses</span>
          <ul className="duo-list">
            <li><Icon.Check size={14}/> Filtre por especialidade, certificação e disponibilidade</li>
            <li><Icon.Check size={14}/> Veja rate por hora, rating e histórico antes de conversar</li>
            <li><Icon.Check size={14}/> Contrate com NDA e escopo padrão da AegisHub</li>
            <li><Icon.Check size={14}/> Pagamento liberado só após entrega aceita</li>
          </ul>
          <div className="mt-4">
            <button className="btn btn-sm" onClick={() => { setAccount('empresa'); navigate('/app/pentesters'); }}>
              Ver catálogo de pentesters <Icon.ArrowRight />
            </button>
          </div>
        </div>

        <div className="duo-card">
          <span className="duo-eyebrow">Para pentesters</span>
          <span className="duo-title">Sua agenda, seu valor por hora, sua reputação</span>
          <ul className="duo-list">
            <li><Icon.Check size={14}/> Defina rate, status e especialidades em um clique</li>
            <li><Icon.Check size={14}/> Veja propostas filtradas pelo seu perfil técnico</li>
            <li><Icon.Check size={14}/> Selo azul ao verificar OSCP, CRTP e outras certs</li>
            <li><Icon.Check size={14}/> Comissão fixa de 8%. Sem fee oculto.</li>
          </ul>
          <div className="mt-4">
            <button className="btn btn-sm" onClick={() => { setAccount('pentester'); navigate('/app/propostas'); }}>
              Ver propostas abertas <Icon.ArrowRight />
            </button>
          </div>
        </div>
      </div>

      <div className="container section">
        <div className="row" style={{ gap: 32, flexWrap: 'wrap' }}>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="rate-value" style={{ fontSize: 28 }}>312</span>
            <span className="muted" style={{ fontSize: 13 }}>pentesters verificados</span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="rate-value" style={{ fontSize: 28 }}>1.847</span>
            <span className="muted" style={{ fontSize: 13 }}>projetos concluídos em 2025</span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="rate-value" style={{ fontSize: 28 }}>R$ 287</span>
            <span className="muted" style={{ fontSize: 13 }}>rate médio por hora</span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="rate-value" style={{ fontSize: 28 }}>4,8</span>
            <span className="muted" style={{ fontSize: 13 }}>avaliação média de empresas</span>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '0.5px solid var(--border)', padding: '24px 0', marginTop: 32 }}>
        <div className="container row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Logo />
          <div className="muted" style={{ fontSize: 12 }}>
            © 2026 AegisHub · Termos · Privacidade · Comunidade
          </div>
        </div>
      </footer>
    </div>
  );
}

function Auth({ mode, navigate, setAccount }) {
  const [tab, setTab] = React.useState(mode); // login | cadastro
  const [tipo, setTipo] = React.useState('empresa'); // empresa | pentester
  React.useEffect(() => setTab(mode), [mode]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
          <Logo />
          <span className="muted" style={{ fontSize: 12 }}>v1.0</span>
        </div>

        <div className="auth-tabs" role="tablist">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); navigate('/login'); }}>Entrar</button>
          <button className={tab === 'cadastro' ? 'active' : ''} onClick={() => { setTab('cadastro'); navigate('/cadastro'); }}>Criar conta</button>
        </div>

        {tab === 'cadastro' && (
          <div className="mb-4">
            <span className="label">Tipo de conta</span>
            <div className="row gap-2">
              <button
                className={`pill ${tipo === 'empresa' ? 'pill-active' : ''}`}
                onClick={() => setTipo('empresa')}
              ><Icon.Building size={12}/> Empresa</button>
              <button
                className={`pill ${tipo === 'pentester' ? 'pill-active' : ''}`}
                onClick={() => setTipo('pentester')}
              ><Icon.Shield size={12}/> Pentester</button>
            </div>
          </div>
        )}

        {tab === 'cadastro' && tipo === 'empresa' && (
          <>
            <div className="mb-2"><span className="label">Razão social</span><input className="input" defaultValue="Banco Lumen S/A"/></div>
            <div className="mb-2"><span className="label">CNPJ</span><input className="input" defaultValue="23.451.882/0001-09"/></div>
          </>
        )}
        {tab === 'cadastro' && tipo === 'pentester' && (
          <>
            <div className="mb-2"><span className="label">Nome completo</span><input className="input" defaultValue="Mariana Albuquerque"/></div>
            <div className="mb-2"><span className="label">CPF</span><input className="input" defaultValue="123.456.789-00"/></div>
          </>
        )}

        <div className="mb-2"><span className="label">E-mail</span><input className="input" type="email" defaultValue="voce@empresa.com.br"/></div>
        <div className="mb-2"><span className="label">Senha</span><input className="input" type="password" defaultValue="••••••••••"/></div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          onClick={() => {
            const acct = tab === 'cadastro' ? tipo : 'empresa';
            setAccount(acct);
            navigate(acct === 'empresa' ? '/app/pentesters' : '/app/propostas');
          }}
        >
          {tab === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <div className="muted mt-4" style={{ fontSize: 12, textAlign: 'center' }}>
          Ao continuar você concorda com os Termos e a Política de privacidade.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Landing, Auth });
