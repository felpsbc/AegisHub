// AegisHub — main app: hash router + Tweaks
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle } = window;

// EDITMODE defaults
const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "account": "empresa",
  "density": "comfortable",
  "fontFamily": "Inter",
  "accentHue": "blue",
  "theme": "light"
}/*EDITMODE-END*/;

function useHashRoute() {
  const get = () => {
    const h = window.location.hash || '#/';
    return h.replace(/^#/, '') || '/';
  };
  const [route, setRoute] = React.useState(get());
  React.useEffect(() => {
    const onChange = () => setRoute(get());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = React.useCallback((to) => {
    window.location.hash = '#' + to;
    window.scrollTo(0, 0);
  }, []);
  return [route, navigate];
}

function App() {
  const [route, navigate] = useHashRoute();
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [toast, setToast] = React.useState(null);
  const [_, force] = React.useReducer(x => x + 1, 0);

  const account = tweaks.account || 'empresa';
  const setAccount = (a) => setTweak('account', a);

  // Apply tweaks to root
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', tweaks.theme === 'dark' ? 'dark' : 'light');
    if (tweaks.fontFamily === 'Geist') {
      root.style.setProperty('font-family', "'Geist', 'Inter', -apple-system, sans-serif");
      document.body.style.fontFamily = "'Geist', 'Inter', -apple-system, sans-serif";
    } else if (tweaks.fontFamily === 'IBM Plex Sans') {
      document.body.style.fontFamily = "'IBM Plex Sans', 'Inter', sans-serif";
    } else {
      document.body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    }
    const accents = {
      blue: '#1E40AF',
      indigo: '#4338CA',
      teal: '#0F766E',
      slate: '#0A0A0A',
    };
    root.style.setProperty('--accent', accents[tweaks.accentHue] || '#1E40AF');

    if (tweaks.density === 'compact') {
      root.style.setProperty('--radius-card', '10px');
    } else {
      root.style.setProperty('--radius-card', '12px');
    }
  }, [tweaks.fontFamily, tweaks.accentHue, tweaks.density, tweaks.theme]);

  const showToast = (msg) => setToast(msg);

  // Routing
  let page = null;
  if (route === '/' || route === '') {
    page = <Landing navigate={navigate} setAccount={setAccount}/>;
  } else if (route === '/login') {
    page = <Auth mode="login" navigate={navigate} setAccount={setAccount}/>;
  } else if (route === '/cadastro') {
    page = <Auth mode="cadastro" navigate={navigate} setAccount={setAccount}/>;
  } else if (route === '/app/pentesters') {
    page = <PentestersCatalog navigate={navigate} setSelectedPentester={() => {}}/>;
  } else if (route.startsWith('/app/pentesters/')) {
    const id = route.split('/').pop();
    page = <PentesterDetail id={id} navigate={navigate} account={account} showToast={showToast}/>;
  } else if (route === '/app/propostas') {
    page = <PropostasCatalog navigate={navigate} setSelectedProposta={() => {}} account={account}/>;
  } else if (route.startsWith('/app/propostas/')) {
    const id = route.split('/').pop();
    page = <PropostaDetail id={id} navigate={navigate} account={account} showToast={showToast}/>;
  } else if (route === '/app/dashboard') {
    page = <Dashboard account={account} navigate={navigate}/>;
  } else if (route === '/app/perfil') {
    page = <PerfilUser account={account} showToast={showToast}/>;
  } else if (route === '/admin') {
    page = <Admin navigate={navigate}/>;
  } else {
    page = (
      <div className="container" style={{ padding: 64, textAlign: 'center' }}>
        <h1 className="h1">404</h1>
        <p className="muted">Página não encontrada.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Início</button>
      </div>
    );
  }

  return (
    <>
      <Topbar route={route} navigate={navigate} account={account} setAccount={setAccount} theme={tweaks.theme} setTheme={(t) => setTweak('theme', t)}/>
      {page}
      <Toast msg={toast} onDone={() => setToast(null)}/>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Tema">
          <TweakRadio
            value={tweaks.theme}
            onChange={(v) => setTweak('theme', v)}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Conta ativa" description="Alterna a visão entre empresa, pentester e admin.">
          <TweakRadio
            value={tweaks.account}
            onChange={(v) => setTweak('account', v)}
            options={[
              { value: 'empresa', label: 'Empresa' },
              { value: 'pentester', label: 'Pentester' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Tipografia">
          <TweakSelect
            value={tweaks.fontFamily}
            onChange={(v) => setTweak('fontFamily', v)}
            options={[
              { value: 'Inter', label: 'Inter' },
              { value: 'Geist', label: 'Geist Sans' },
              { value: 'IBM Plex Sans', label: 'IBM Plex Sans' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Cor de destaque" description="Usado em CTAs primários e selo verificado.">
          <TweakRadio
            value={tweaks.accentHue}
            onChange={(v) => setTweak('accentHue', v)}
            options={[
              { value: 'blue', label: 'Azul' },
              { value: 'indigo', label: 'Índigo' },
              { value: 'teal', label: 'Teal' },
              { value: 'slate', label: 'Preto' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Densidade">
          <TweakRadio
            value={tweaks.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'comfortable', label: 'Confortável' },
              { value: 'compact', label: 'Compacta' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
