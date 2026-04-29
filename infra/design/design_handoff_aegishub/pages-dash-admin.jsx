// Dashboard (varies by account) + Admin panel
const { Icon } = window;

function Dashboard({ account, navigate }) {
  const data = window.AH_DATA;

  if (account === 'empresa') {
    const empresa = data.empresaUser;
    const candidatos = data.pentesters.slice(0, 4);
    return (
      <div className="container" style={{ padding: '32px 0 64px' }}>
        <h1 className="h1 mb-4">Bom dia, {empresa.nome.split(' ')[0]}</h1>
        <div className="row gap-3 mb-4 flex-wrap">
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">2</span>
            <span className="stat-label">Contratações ativas</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">1</span>
            <span className="stat-label">Proposta publicada</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">8</span>
            <span className="stat-label">Candidaturas recebidas</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">R$ 38k</span>
            <span className="stat-label">Em escrow</span>
          </div>
        </div>

        <div className="card card-pad-lg mb-4">
          <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
            <h2 className="h2">Candidaturas na sua proposta</h2>
            <a className="muted" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/app/propostas/pr1')}>Ver proposta →</a>
          </div>
          <div className="col" style={{ gap: 0 }}>
            {candidatos.map((p, i) => (
              <div key={p.id} className="row gap-3" style={{ padding: '14px 0', borderBottom: i < candidatos.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <Avatar name={p.nome} color={p.color} />
                <div className="col" style={{ flex: 1 }}>
                  <div className="row gap-2">
                    <strong style={{ fontWeight: 500 }}>{p.nome}</strong>
                    {p.verificado && <Verified/>}
                  </div>
                  <span className="muted" style={{ fontSize: 13 }}>{p.specShort} · {p.cidade}</span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <strong style={{ fontWeight: 500 }}>R$ {p.rate}<span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>/h</span></strong>
                  <span className="muted" style={{ fontSize: 12 }}>candidatou-se há 4h</span>
                </div>
                <button className="btn btn-sm" onClick={() => navigate(`/app/pentesters/${p.id}`)}>Ver perfil</button>
              </div>
            ))}
          </div>
        </div>

        <div className="row gap-3 flex-wrap">
          <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
            <h2 className="h2 mb-4">Contratações em andamento</h2>
            {[
              { titulo: 'Pentest mobile — app cliente', pent: 'Beatriz Camargo', etapa: 'Execução', prog: 0.6 },
              { titulo: 'Cloud review AWS', pent: 'João Henrique Souza', etapa: 'Reteste', prog: 0.85 },
            ].map((c, i) => (
              <div key={i} style={{ padding: '12px 0', borderTop: i ? '0.5px solid var(--border)' : 'none' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong style={{ fontWeight: 500 }}>{c.titulo}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{c.etapa}</span>
                </div>
                <span className="muted" style={{ fontSize: 13 }}>com {c.pent}</span>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 999, marginTop: 8 }}>
                  <div style={{ width: `${c.prog * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
            <h2 className="h2 mb-4">Atalhos</h2>
            <div className="col gap-2">
              <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/app/propostas')}>
                <Icon.Plus/> Publicar nova proposta
              </button>
              <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/app/pentesters')}>
                <Icon.Search/> Buscar pentesters
              </button>
              <button className="btn" style={{ justifyContent: 'flex-start' }}>
                <Icon.FileText/> Modelos de NDA e escopo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (account === 'pentester') {
    const p = data.pentesterUser;
    return (
      <div className="container" style={{ padding: '32px 0 64px' }}>
        <h1 className="h1 mb-4">Olá, {p.nome.split(' ')[0]}</h1>

        <div className="card card-pad-lg mb-4">
          <div className="row gap-3 flex-wrap">
            <div className="col" style={{ flex: 1, minWidth: 200 }}>
              <span className="muted" style={{ fontSize: 12 }}>Status atual</span>
              <StatusDot status={p.status}/>
            </div>
            <div className="col" style={{ flex: 1, minWidth: 200 }}>
              <span className="muted" style={{ fontSize: 12 }}>Seu valor por hora</span>
              <span className="row" style={{ gap: 2, alignItems: 'baseline' }}>
                <span className="rate-value">R$ {p.rate}</span><span className="rate-unit">/h</span>
              </span>
            </div>
            <div className="col" style={{ flex: 1, minWidth: 200 }}>
              <span className="muted" style={{ fontSize: 12 }}>Faturamento (mês)</span>
              <span className="rate-value">R$ 24.840</span>
            </div>
            <div className="col" style={{ flex: 1, minWidth: 200 }}>
              <span className="muted" style={{ fontSize: 12 }}>Próximo pagamento</span>
              <span style={{ fontSize: 15 }}>05/05/2026</span>
            </div>
          </div>
        </div>

        <div className="row gap-3 mb-4 flex-wrap">
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">3</span>
            <span className="stat-label">Candidaturas ativas</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">1</span>
            <span className="stat-label">Projeto em andamento</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">7</span>
            <span className="stat-label">Convites diretos</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 180 }}>
            <span className="stat-num">{p.rating.toFixed(1)}</span>
            <span className="stat-label">Rating · {p.projetos} projetos</span>
          </div>
        </div>

        <div className="card card-pad-lg mb-4">
          <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
            <h2 className="h2">Propostas que combinam com seu perfil</h2>
            <a className="muted" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/app/propostas')}>Ver todas →</a>
          </div>
          <div className="list-propostas">
            {data.propostas.slice(0, 3).map(pr => (
              <PropostaCard key={pr.id} pr={pr} onClick={() => navigate(`/app/propostas/${pr.id}`)} />
            ))}
          </div>
        </div>

        <div className="card card-pad-lg">
          <h2 className="h2 mb-4">Convites diretos</h2>
          <div className="col" style={{ gap: 0 }}>
            {[
              { empresa: 'Cíclica Saúde', titulo: 'Cloud review AWS', valor: 28000 },
              { empresa: 'Granito Capital', titulo: 'Phishing dirigido C-level', valor: 18000 },
            ].map((c, i) => (
              <div key={i} className="row gap-3" style={{ padding: '14px 0', borderBottom: i === 0 ? '0.5px solid var(--border)' : 'none' }}>
                <Avatar name={c.empresa} color={data.hashColor(c.empresa)}/>
                <div className="col" style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>{c.titulo}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>de {c.empresa}</span>
                </div>
                <strong style={{ fontWeight: 500 }}>R$ {c.valor.toLocaleString('pt-BR')}</strong>
                <button className="btn btn-sm">Ver</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // admin dashboard
  return <Admin navigate={navigate} />;
}

function Admin({ navigate }) {
  const data = window.AH_DATA;
  const [tab, setTab] = React.useState('verificacoes');
  const [verifs, setVerifs] = React.useState(data.verificacoes);

  const decide = (id, ok) => setVerifs(v => v.filter(x => x.id !== id));

  return (
    <div className="container admin">
      <aside className="admin-nav">
        <span className="muted" style={{ fontSize: 11, padding: '0 10px 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Painel</span>
        <button className={tab === 'visao' ? 'active' : ''} onClick={() => setTab('visao')}>
          <Icon.TrendingUp size={13}/> Visão geral
        </button>
        <button className={tab === 'verificacoes' ? 'active' : ''} onClick={() => setTab('verificacoes')}>
          <Icon.CheckBadge size={13}/> Verificações
          {verifs.length > 0 && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--accent-fg)', borderRadius: 999, padding: '0 6px', fontSize: 10, lineHeight: '16px' }}>{verifs.length}</span>}
        </button>
        <button className={tab === 'usuarios' ? 'active' : ''} onClick={() => setTab('usuarios')}>
          <Icon.Users size={13}/> Usuários
        </button>
        <button className={tab === 'comissoes' ? 'active' : ''} onClick={() => setTab('comissoes')}>
          <Icon.DollarSign size={13}/> Comissões
        </button>
        <button className={tab === 'moderacao' ? 'active' : ''} onClick={() => setTab('moderacao')}>
          <Icon.FileText size={13}/> Moderação
        </button>
      </aside>

      <div>
        {tab === 'visao' && (
          <>
            <h1 className="h1 mb-4">Visão geral</h1>
            <div className="row gap-3 mb-4 flex-wrap">
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">312</span>
                <span className="stat-label">Pentesters verificados</span>
              </div>
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">128</span>
                <span className="stat-label">Empresas ativas</span>
              </div>
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">47</span>
                <span className="stat-label">Projetos em andamento</span>
              </div>
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">R$ 184k</span>
                <span className="stat-label">Comissão (mês)</span>
              </div>
            </div>

            <div className="card card-pad-lg mb-4">
              <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
                <h2 className="h2">Receita por mês — últimos 12</h2>
                <span className="muted" style={{ fontSize: 12 }}>Comissão de 8% sobre GMV</span>
              </div>
              <div className="bars">
                {[42, 56, 51, 68, 72, 89, 95, 112, 128, 141, 167, 184].map((v, i, arr) => (
                  <div key={i} className={`bar ${i === arr.length - 1 ? 'accent' : ''}`} style={{ height: `${(v / 184) * 100}%` }} title={`R$ ${v}k`}></div>
                ))}
              </div>
              <div className="row mt-2" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                <span>mai/25</span><span>nov/25</span><span>abr/26</span>
              </div>
            </div>
          </>
        )}

        {tab === 'verificacoes' && (
          <>
            <h1 className="h1 mb-4">Verificações pendentes</h1>
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Pentester</th>
                    <th>Certificação</th>
                    <th>Enviado</th>
                    <th>Arquivo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {verifs.map(v => (
                    <tr key={v.id}>
                      <td>
                        <span className="row gap-2">
                          <Avatar name={v.user} size="sm"/> {v.user}
                        </span>
                      </td>
                      <td><span className="badge">{v.cert}</span></td>
                      <td className="muted">{v.enviado}</td>
                      <td className="muted">{v.arquivo}</td>
                      <td className="text-right">
                        <span className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => decide(v.id, false)}>Rejeitar</button>
                          <button className="btn btn-primary btn-sm" onClick={() => decide(v.id, true)}>Aprovar</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {verifs.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Sem pendências. Boa.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'usuarios' && (
          <>
            <h1 className="h1 mb-4">Usuários</h1>
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th><th>Tipo</th><th>Verificado</th><th>Projetos</th><th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pentesters.slice(0, 8).map(p => (
                    <tr key={p.id}>
                      <td>
                        <span className="row gap-2">
                          <Avatar name={p.nome} color={p.color} size="sm"/> {p.nome}
                        </span>
                      </td>
                      <td className="muted">Pentester</td>
                      <td>{p.verificado ? <span className="row gap-2"><Verified/> sim</span> : <span className="muted">—</span>}</td>
                      <td>{p.projetos}</td>
                      <td>{p.rating.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'comissoes' && (
          <>
            <h1 className="h1 mb-4">Comissões</h1>
            <div className="row gap-3 mb-4 flex-wrap">
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">R$ 184.320</span>
                <span className="stat-label">Comissão acumulada (mês)</span>
              </div>
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">8,0%</span>
                <span className="stat-label">Taxa atual</span>
              </div>
              <div className="stat" style={{ flex: 1, minWidth: 180 }}>
                <span className="stat-num">R$ 2,3M</span>
                <span className="stat-label">GMV (mês)</span>
              </div>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Projeto</th><th>Empresa</th><th>Pentester</th><th>Valor</th><th>Comissão</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Pentest open finance', 'Banco Lumen', 'Mariana Albuquerque', 38000],
                    ['Mobile delivery', 'Sabor Express', 'Beatriz Camargo', 22000],
                    ['Red team interno', 'Construtora Itacira', 'Letícia Vasconcelos', 62000],
                    ['Cloud AWS', 'Cíclica Saúde', 'João Henrique Souza', 28000],
                    ['Phishing dirigido', 'Granito Capital', 'Tainá Moraes', 18000],
                  ].map(([t, e, p, v], i) => (
                    <tr key={i}>
                      <td>{t}</td>
                      <td className="muted">{e}</td>
                      <td className="muted">{p}</td>
                      <td>R$ {v.toLocaleString('pt-BR')}</td>
                      <td><strong style={{ fontWeight: 500 }}>R$ {(v * 0.08).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'moderacao' && (
          <>
            <h1 className="h1 mb-4">Moderação</h1>
            <div className="card card-pad-lg" style={{ textAlign: 'center', color: 'var(--text-2)', padding: 64 }}>
              Sem reportes abertos no momento.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, Admin });
