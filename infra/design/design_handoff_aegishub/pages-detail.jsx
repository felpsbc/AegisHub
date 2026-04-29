// Detail pages: Pentester profile, Proposta detail, User profile
const { Icon } = window;

function PentesterDetail({ id, navigate, account, showToast }) {
  const data = window.AH_DATA;
  const p = data.pentesters.find(x => x.id === id) || data.pentesters[0];
  const [showModal, setShowModal] = React.useState(false);

  const recents = [
    { titulo: 'Pentest web app — varejo', empresa: 'Mercado anônimo', meses: '02/2026', rating: 5 },
    { titulo: 'API REST — fintech', empresa: 'Banco anônimo', meses: '11/2025', rating: 5 },
    { titulo: 'Mobile Android — saúde', empresa: 'Healthtech anônima', meses: '09/2025', rating: 4.5 },
  ];

  return (
    <div className="container detail">
      <div>
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/app/pentesters')}>
          <Icon.ArrowLeft size={13}/> Voltar ao catálogo
        </button>

        <div className="card card-pad-lg">
          <div className="row gap-4">
            <Avatar name={p.nome} color={p.color} size="xl" />
            <div className="col" style={{ flex: 1, gap: 4 }}>
              <div className="row gap-2">
                <h1 className="h1">{p.nome}</h1>
                {p.verificado && <Verified />}
              </div>
              <span className="muted" style={{ fontSize: 13 }}>{p.handle} · Desde {p.desde}</span>
              <div className="row gap-3 mt-2">
                <StatusDot status={p.status} />
                <span className="muted" style={{ fontSize: 12 }}>·</span>
                <span className="row" style={{ gap: 4, fontSize: 13 }}>
                  <Icon.Star size={12}/> <strong style={{ fontWeight: 500 }}>{p.rating.toFixed(1)}</strong>
                  <span className="muted">({p.projetos} projetos)</span>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>·</span>
                <span className="row" style={{ gap: 4, fontSize: 13 }}>
                  <Icon.Pin size={12}/> {p.cidade}
                </span>
              </div>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
              <span className="rate-value">R$ {p.rate}</span>
              <span className="rate-unit">por hora</span>
            </div>
          </div>

          <hr className="hr"/>
          <p className="body-15" style={{ marginTop: 0 }}>{p.bio}</p>
        </div>

        <div className="card card-pad-lg mt-4">
          <h2 className="h2 mb-4">Especialidades</h2>
          <div className="chips">
            {p.especialidades.map(e => <span key={e} className="pill" style={{ cursor: 'default' }}>{e}</span>)}
          </div>

          <h2 className="h2 mt-6 mb-4">Certificações</h2>
          <div className="row gap-3 flex-wrap">
            {p.certs.map(c => (
              <div key={c} className="row gap-2" style={{ padding: '10px 14px', border: '0.5px solid var(--border)', borderRadius: 8 }}>
                <Verified title="Verificada pela AegisHub" />
                <span style={{ fontWeight: 500 }}>{c}</span>
                <span className="muted" style={{ fontSize: 12 }}>verificada</span>
              </div>
            ))}
          </div>

          <h2 className="h2 mt-6 mb-4">Idiomas</h2>
          <div className="muted">{p.idiomas.join(' · ')}</div>
        </div>

        <div className="card card-pad-lg mt-4">
          <h2 className="h2 mb-4">Projetos recentes</h2>
          <div className="col" style={{ gap: 0 }}>
            {recents.map((r, i) => (
              <div key={i} className="row" style={{ padding: '14px 0', borderBottom: i < recents.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{r.titulo}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{r.empresa} · {r.meses}</div>
                </div>
                <span className="row" style={{ gap: 4, fontSize: 13 }}>
                  <Icon.Star size={12}/> {r.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="detail-aside">
        <div className="card">
          <div className="col" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>Disponibilidade</span>
            <StatusDot status={p.status} />
          </div>
          <hr className="hr"/>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowModal(true)}
          >Enviar proposta direta</button>
          <button className="btn mt-2" style={{ width: '100%', justifyContent: 'center' }}>
            Salvar perfil
          </button>
          <p className="muted mt-2" style={{ fontSize: 12 }}>
            Resposta média: 4 horas em dias úteis.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: 0, marginBottom: 12 }}>Estatísticas</h3>
          <div className="col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>Projetos concluídos</span>
              <strong style={{ fontWeight: 500 }}>{p.projetos}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>Taxa de conclusão</span>
              <strong style={{ fontWeight: 500 }}>98%</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>Resposta a propostas</span>
              <strong style={{ fontWeight: 500 }}>92%</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 13 }}>Reportes entregues</span>
              <strong style={{ fontWeight: 500 }}>{p.projetos + 4}</strong>
            </div>
          </div>
        </div>
      </aside>

      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
              <h2 className="h2">Enviar proposta para {p.nome.split(' ')[0]}</h2>
              <button className="btn-ghost" style={{ background: 'none', border: 'none' }} onClick={() => setShowModal(false)}>
                <Icon.X />
              </button>
            </div>
            <div className="mb-2"><span className="label">Título do projeto</span><input className="input" defaultValue="Pentest web app — open finance"/></div>
            <div className="mb-2"><span className="label">Escopo (resumo)</span><textarea className="textarea" rows="4" defaultValue="SPA + 24 endpoints REST + autenticação OAuth."/></div>
            <div className="row gap-2">
              <div style={{ flex: 1 }}><span className="label">Budget</span><input className="input" defaultValue="R$ 38.000"/></div>
              <div style={{ flex: 1 }}><span className="label">Prazo</span><input className="input" defaultValue="4 semanas"/></div>
            </div>
            <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => { setShowModal(false); showToast('Proposta enviada para ' + p.nome.split(' ')[0]); }}
              >Enviar proposta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropostaDetail({ id, navigate, account, showToast }) {
  const data = window.AH_DATA;
  const pr = data.propostas.find(x => x.id === id) || data.propostas[0];
  const [applied, setApplied] = React.useState(false);

  return (
    <div className="container detail">
      <div>
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/app/propostas')}>
          <Icon.ArrowLeft size={13}/> Voltar às propostas
        </button>

        <div className="card card-pad-lg">
          <div className="row gap-3 mb-2 flex-wrap">
            {pr.categorias.map(c => <span key={c.label} className={`tag tag-${c.tone}`}>{c.label}</span>)}
            <span className="tag tag-stone">{pr.tipoTeste}</span>
            <span className="tag tag-stone">{pr.remoto ? 'Remoto' : 'Presencial'}</span>
          </div>
          <h1 className="h1" style={{ fontSize: 26, lineHeight: 1.2 }}>{pr.titulo}</h1>
          <div className="row gap-3 mt-2 flex-wrap" style={{ color: 'var(--text-2)', fontSize: 13 }}>
            <span className="row" style={{ gap: 6 }}>
              <Avatar name={pr.empresa} color={pr.empresaColor} size="sm"/>
              {pr.empresa} · {pr.empresaTipo}
            </span>
            <span>·</span>
            <span className="row" style={{ gap: 4 }}><Icon.Clock /> {pr.publicado}</span>
            <span>·</span>
            <span className="row" style={{ gap: 4 }}><Icon.Users size={12}/> {pr.candidaturas} candidaturas</span>
          </div>
        </div>

        <div className="card card-pad-lg mt-4">
          <h2 className="h2 mb-4">Escopo</h2>
          <p className="body-15">{pr.escopo}</p>

          <h2 className="h2 mt-6 mb-4">Requisitos</h2>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {pr.requisitos.map((r, i) => (
              <li key={i} style={{ padding: '4px 0' }}>{r}</li>
            ))}
          </ul>

          <h2 className="h2 mt-6 mb-4">Como será o trabalho</h2>
          <ol style={{ paddingLeft: 18, margin: 0, color: 'var(--text)' }}>
            <li style={{ padding: '4px 0' }}>Kick-off por vídeo + assinatura de NDA padrão da AegisHub.</li>
            <li style={{ padding: '4px 0' }}>Acesso liberado a ambiente de homologação.</li>
            <li style={{ padding: '4px 0' }}>Daily curto opcional + relatório executivo + relatório técnico.</li>
            <li style={{ padding: '4px 0' }}>Reteste incluso após correções.</li>
          </ol>
        </div>
      </div>

      <aside className="detail-aside">
        <div className="card">
          <div className="col" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>Budget</span>
            <span className="rate-value">R$ {pr.budget.toLocaleString('pt-BR')}</span>
            <span className="muted" style={{ fontSize: 13 }}>Prazo: {pr.prazo}</span>
          </div>
          <hr className="hr"/>
          {account === 'pentester' ? (
            <button
              className={`btn ${applied ? '' : 'btn-primary'}`}
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={applied}
              onClick={() => { setApplied(true); showToast('Candidatura enviada'); }}
            >
              {applied ? <><Icon.Check/> Candidatura enviada</> : 'Candidatar-se'}
            </button>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Editar proposta
            </button>
          )}
          <button className="btn mt-2" style={{ width: '100%', justifyContent: 'center' }}>Salvar</button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', margin: 0, marginBottom: 12 }}>Empresa</h3>
          <div className="row gap-2 mb-2">
            <Avatar name={pr.empresa} color={pr.empresaColor} />
            <div className="col">
              <span style={{ fontWeight: 500 }}>{pr.empresa}</span>
              <span className="muted" style={{ fontSize: 12 }}>{pr.empresaTipo}</span>
            </div>
          </div>
          <div className="col" style={{ gap: 8, marginTop: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
              <span className="muted">Avaliação</span>
              <span className="row" style={{ gap: 4 }}><Icon.Star size={11}/> 4.9</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
              <span className="muted">Projetos publicados</span>
              <span>14</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
              <span className="muted">Tempo médio de resposta</span>
              <span>6h</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PerfilUser({ account, showToast }) {
  const data = window.AH_DATA;
  if (account === 'pentester') {
    const p = data.pentesterUser;
    const [rate, setRate] = React.useState(p.rate);
    const [status, setStatus] = React.useState(p.status);
    return (
      <div className="container" style={{ padding: '32px 0 64px', maxWidth: 800 }}>
        <h1 className="h1 mb-4">Seu perfil</h1>
        <div className="card card-pad-lg">
          <div className="row gap-3">
            <Avatar name={p.nome} color={p.color} size="lg" />
            <div className="col" style={{ flex: 1, gap: 2 }}>
              <div className="row gap-2"><strong style={{ fontWeight: 500 }}>{p.nome}</strong><Verified/></div>
              <span className="muted" style={{ fontSize: 13 }}>{p.handle}</span>
            </div>
          </div>
          <hr className="hr"/>

          <div className="row gap-3 mb-4">
            <div style={{ flex: 1 }}>
              <span className="label">Status</span>
              <div className="toggle">
                <button className={status === 'open' ? 'active' : ''} onClick={() => { setStatus('open'); showToast('Agora aberto a propostas'); }}>
                  <span className="dot dot-open" style={{ marginRight: 6 }}></span>Aberto
                </button>
                <button className={status === 'busy' ? 'active' : ''} onClick={() => { setStatus('busy'); showToast('Status: em projeto'); }}>
                  <span className="dot dot-busy" style={{ marginRight: 6 }}></span>Em projeto
                </button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">Valor por hora — R$ {rate}</span>
              <input className="range" type="range" min="180" max="500" step="10" value={rate}
                     onChange={(e) => setRate(Number(e.target.value))}/>
            </div>
          </div>

          <span className="label">Bio</span>
          <textarea className="textarea" rows="3" defaultValue={p.bio}/>

          <div className="row gap-3 mt-4">
            <div style={{ flex: 1 }}>
              <span className="label">Cidade</span>
              <input className="input" defaultValue={p.cidade}/>
            </div>
            <div style={{ flex: 1 }}>
              <span className="label">Idiomas</span>
              <input className="input" defaultValue={p.idiomas.join(', ')}/>
            </div>
          </div>

          <div className="mt-4">
            <span className="label">Especialidades</span>
            <div className="chips">
              {p.especialidades.map(e => <span key={e} className="pill pill-active" style={{ cursor: 'default' }}>{e} <Icon.X size={11}/></span>)}
              <button className="pill"><Icon.Plus size={11}/> adicionar</button>
            </div>
          </div>

          <div className="mt-4">
            <span className="label">Certificações</span>
            <div className="chips">
              {p.certs.map(c => (
                <span key={c} className="row gap-2" style={{ padding: '6px 10px', border: '0.5px solid var(--border)', borderRadius: 999, fontSize: 13 }}>
                  <Verified title="Verificada"/>{c}
                </span>
              ))}
              <button className="pill"><Icon.Plus size={11}/> enviar para verificação</button>
            </div>
          </div>

          <div className="row mt-6" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => showToast('Perfil atualizado')}>Salvar alterações</button>
          </div>
        </div>
      </div>
    );
  }

  if (account === 'empresa') {
    const e = data.empresaUser;
    return (
      <div className="container" style={{ padding: '32px 0 64px', maxWidth: 800 }}>
        <h1 className="h1 mb-4">Perfil da empresa</h1>
        <div className="card card-pad-lg">
          <div className="row gap-3">
            <Avatar name={e.nome} color={e.color} size="lg" />
            <div className="col" style={{ flex: 1, gap: 2 }}>
              <strong style={{ fontWeight: 500 }}>{e.nome}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{e.setor} · {e.tamanho}</span>
            </div>
          </div>
          <hr className="hr"/>
          <div className="row gap-3 mb-2">
            <div style={{ flex: 1 }}><span className="label">CNPJ</span><input className="input" defaultValue={e.cnpj}/></div>
            <div style={{ flex: 1 }}><span className="label">Setor</span><input className="input" defaultValue={e.setor}/></div>
          </div>
          <div className="row gap-3 mb-2">
            <div style={{ flex: 1 }}><span className="label">Cidade</span><input className="input" defaultValue={e.cidade}/></div>
            <div style={{ flex: 1 }}><span className="label">Tamanho</span><input className="input" defaultValue={e.tamanho}/></div>
          </div>
          <span className="label">Sobre</span>
          <textarea className="textarea" rows="3" defaultValue="Banco digital com foco em open finance e PIX. Equipe de segurança interna pequena, contratamos pentests trimestrais."/>
          <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => showToast('Perfil atualizado')}>Salvar</button>
          </div>
        </div>
      </div>
    );
  }

  // admin profile - simple
  return (
    <div className="container" style={{ padding: '32px 0 64px', maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name="Operações AegisHub" color="stone" size="lg" />
          <div className="col"><strong style={{ fontWeight: 500 }}>Operações AegisHub</strong><span className="muted" style={{ fontSize: 13 }}>admin@aegishub.com.br</span></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PentesterDetail, PropostaDetail, PerfilUser });
