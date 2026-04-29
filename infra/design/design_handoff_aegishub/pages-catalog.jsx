// Catalog pages: pentesters and propostas
const { Icon } = window;

function CheckboxRow({ label, checked, onChange, count }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={onChange}/>
      <span className="box">{checked && <Icon.Check size={10}/>}</span>
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </label>
  );
}

function PentestersCatalog({ navigate, setSelectedPentester }) {
  const data = window.AH_DATA;
  const [especialidadesSel, setEsp] = React.useState(new Set());
  const [certsSel, setCerts] = React.useState(new Set());
  const [maxRate, setMaxRate] = React.useState(500);
  const [onlyOpen, setOnlyOpen] = React.useState(false);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('Mais relevantes');

  const toggle = (set, setter) => (val) => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    setter(n);
  };

  let list = data.pentesters.filter(p => {
    if (query && !(p.nome.toLowerCase().includes(query.toLowerCase()) || p.bio.toLowerCase().includes(query.toLowerCase()))) return false;
    if (especialidadesSel.size && !p.especialidades.some(e => especialidadesSel.has(e))) return false;
    if (certsSel.size && !p.certs.some(c => certsSel.has(c))) return false;
    if (p.rate > maxRate) return false;
    if (onlyOpen && p.status !== 'open') return false;
    if (verifiedOnly && !p.verificado) return false;
    return true;
  });

  if (sort === 'Menor valor/hora') list = [...list].sort((a, b) => a.rate - b.rate);
  else if (sort === 'Maior rating') list = [...list].sort((a, b) => b.rating - a.rating);
  else if (sort === 'Mais projetos') list = [...list].sort((a, b) => b.projetos - a.projetos);

  const countByEsp = data.especialidades.reduce((acc, e) => {
    acc[e] = data.pentesters.filter(p => p.especialidades.includes(e)).length;
    return acc;
  }, {});
  const countByCert = data.certificacoes.reduce((acc, c) => {
    acc[c] = data.pentesters.filter(p => p.certs.includes(c)).length;
    return acc;
  }, {});

  return (
    <div className="container catalog">
      <aside className="sidebar">
        <div className="sidebar-section" style={{ paddingTop: 0 }}>
          <h3>Buscar</h3>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
              <Icon.Search size={13}/>
            </span>
            <input
              className="input"
              placeholder="Nome ou habilidade"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Disponibilidade</h3>
          <CheckboxRow label="Só aberto a propostas" checked={onlyOpen} onChange={() => setOnlyOpen(v => !v)} />
          <CheckboxRow label="Só verificados" checked={verifiedOnly} onChange={() => setVerifiedOnly(v => !v)} />
        </div>

        <div className="sidebar-section">
          <h3>Valor por hora — até R$ {maxRate}</h3>
          <input className="range" type="range" min="180" max="500" step="10" value={maxRate}
                 onChange={(e) => setMaxRate(Number(e.target.value))}/>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            <span>R$ 180</span><span>R$ 500</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Especialidades</h3>
          {data.especialidades.map(e => (
            <CheckboxRow key={e}
              label={e}
              checked={especialidadesSel.has(e)}
              onChange={() => toggle(especialidadesSel, setEsp)(e)}
              count={countByEsp[e]}
            />
          ))}
        </div>

        <div className="sidebar-section">
          <h3>Certificações</h3>
          {data.certificacoes.map(c => (
            <CheckboxRow key={c}
              label={c}
              checked={certsSel.has(c)}
              onChange={() => toggle(certsSel, setCerts)(c)}
              count={countByCert[c]}
            />
          ))}
        </div>
      </aside>

      <div className="catalog-main">
        <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="h1">Pentesters</h1>
            <span className="muted" style={{ fontSize: 13 }}>{list.length} resultados</span>
          </div>
          <div className="row gap-2">
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
              <option>Mais relevantes</option>
              <option>Menor valor/hora</option>
              <option>Maior rating</option>
              <option>Mais projetos</option>
            </select>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)' }}>
            Nenhum pentester com esses filtros.
          </div>
        ) : (
          <div className="grid-pentesters">
            {list.map(p => (
              <PentesterCard
                key={p.id}
                p={p}
                onClick={() => { setSelectedPentester(p.id); navigate(`/app/pentesters/${p.id}`); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropostasCatalog({ navigate, setSelectedProposta, account }) {
  const data = window.AH_DATA;
  const [tagsSel, setTags] = React.useState(new Set());
  const [budgetMin, setBudgetMin] = React.useState(10000);
  const [tipoSel, setTipoSel] = React.useState(new Set());
  const [remotoSel, setRemoto] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const allTags = ['Web app', 'API', 'Mobile', 'Cloud', 'Red team', 'Eng. social', 'IoT', 'Hardware', 'Active Directory'];

  const toggle = (set, setter) => (val) => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    setter(n);
  };

  const list = data.propostas.filter(pr => {
    if (query && !pr.titulo.toLowerCase().includes(query.toLowerCase())) return false;
    if (tagsSel.size && !pr.categorias.some(c => tagsSel.has(c.label))) return false;
    if (pr.budget < budgetMin) return false;
    if (tipoSel.size && !tipoSel.has(pr.tipoTeste)) return false;
    if (remotoSel === 'remoto' && !pr.remoto) return false;
    if (remotoSel === 'presencial' && pr.remoto) return false;
    return true;
  });

  return (
    <div className="container catalog">
      <aside className="sidebar">
        <div className="sidebar-section" style={{ paddingTop: 0 }}>
          <h3>Buscar</h3>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
              <Icon.Search size={13}/>
            </span>
            <input
              className="input"
              placeholder="Título da proposta"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Modalidade</h3>
          <CheckboxRow label="Remoto" checked={remotoSel === 'remoto'} onChange={() => setRemoto(remotoSel === 'remoto' ? 'all' : 'remoto')} />
          <CheckboxRow label="Presencial" checked={remotoSel === 'presencial'} onChange={() => setRemoto(remotoSel === 'presencial' ? 'all' : 'presencial')} />
        </div>

        <div className="sidebar-section">
          <h3>Budget mínimo — R$ {budgetMin.toLocaleString('pt-BR')}</h3>
          <input className="range" type="range" min="10000" max="60000" step="2000" value={budgetMin}
                 onChange={(e) => setBudgetMin(Number(e.target.value))}/>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            <span>R$ 10k</span><span>R$ 60k</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Tipo de teste</h3>
          {['Black-box', 'Gray-box', 'White-box'].map(t => (
            <CheckboxRow key={t} label={t}
              checked={tipoSel.has(t)} onChange={() => toggle(tipoSel, setTipoSel)(t)} />
          ))}
        </div>

        <div className="sidebar-section">
          <h3>Categoria</h3>
          {allTags.map(t => (
            <CheckboxRow key={t} label={t}
              checked={tagsSel.has(t)} onChange={() => toggle(tagsSel, setTags)(t)} />
          ))}
        </div>
      </aside>

      <div className="catalog-main">
        <div className="row mb-4" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="h1">Propostas abertas</h1>
            <span className="muted" style={{ fontSize: 13 }}>{list.length} propostas</span>
          </div>
          {account === 'empresa' && (
            <button className="btn btn-primary btn-sm">
              <Icon.Plus size={13}/> Publicar proposta
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)' }}>
            Nenhuma proposta com esses filtros.
          </div>
        ) : (
          <div className="list-propostas">
            {list.map(pr => (
              <PropostaCard
                key={pr.id}
                pr={pr}
                onClick={() => { setSelectedProposta(pr.id); navigate(`/app/propostas/${pr.id}`); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PentestersCatalog, PropostasCatalog });
