# Handoff: AegisHub — Marketplace B2B de Pentest

## Overview
AegisHub é um marketplace B2B de mão dupla que conecta empresas a profissionais autônomos de pentest. Empresas publicam propostas e contratam pentesters; pentesters definem rate/status e se candidatam a propostas; um admin verifica certificações, modera e gerencia comissões.

Este pacote contém o design completo (landing, auth, catálogos, perfis, dashboards, painel admin) com modos claro e escuro.

## About the Design Files
**Os arquivos deste bundle são REFERÊNCIA DE DESIGN feita em HTML** — protótipos mostrando o look-and-feel pretendido e o comportamento esperado, **não código de produção para copiar direto**. A tarefa é **recriar estes designs em React + Vite + Tailwind CSS** (stack pedida na spec original), usando componentes próprios (sem shadcn/MUI), seguindo as decisões visuais documentadas abaixo.

Se o codebase de destino já existir, siga seus padrões; caso contrário, scaffold inicial sugerido:

```
npm create vite@latest aegishub -- --template react
cd aegishub
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom zustand
npm install lucide-react   # icones (lucide), tamanhos 12-16px
```

Tailwind config: estenda `theme.colors` e `theme.fontFamily` com os tokens listados em **Design Tokens** abaixo. Use `darkMode: 'class'` e alterne `<html class="dark">` para o modo escuro.

## Fidelity
**High-fidelity.** Cores, tipografia, espaçamentos, bordas e estados estão todos definidos. Replicar pixel a pixel.

## Stack alvo
- React 18 + Vite
- Tailwind CSS (sem libs de UI)
- React Router v6 para navegação (`/`, `/login`, `/cadastro`, `/app/*`, `/admin`)
- Zustand para estado global (conta ativa, tema, perfil, filtros)
- `lucide-react` para ícones (12–16px)
- Inter via Google Fonts (pesos 400 e 500 apenas)

## Estrutura sugerida de arquivos
```
src/
  main.jsx
  App.jsx
  index.css                 # tokens CSS + base
  routes.jsx
  store/
    useAuth.js              # account: 'empresa' | 'pentester' | 'admin'
    useTheme.js             # 'light' | 'dark'
  data/
    mock.js                 # ver data.js neste pacote
  components/
    Topbar.jsx
    Logo.jsx
    Avatar.jsx
    Verified.jsx
    StatusDot.jsx
    PentesterCard.jsx
    PropostaCard.jsx
    Sidebar.jsx
    Toast.jsx
    Modal.jsx
    Pill.jsx
    Badge.jsx
    Tag.jsx
  pages/
    Landing.jsx
    Auth.jsx                # login + cadastro (tabs)
    PentestersCatalog.jsx
    PentesterDetail.jsx
    PropostasCatalog.jsx
    PropostaDetail.jsx
    Dashboard.jsx           # roteia por account
    Perfil.jsx
    Admin.jsx
```

## Design Tokens

### Cores — Modo Claro
| Token | Valor |
|---|---|
| `--bg` | `#FAFAF9` |
| `--surface` | `#FFFFFF` |
| `--surface-2` (hover) | `#F5F5F4` |
| `--surface-3` (chips) | `#F1F0EE` |
| `--text` | `#0A0A0A` |
| `--text-2` (secundário) | `#6B7280` |
| `--text-3` (terciário) | `#9CA3AF` |
| `--border` | `#E5E5E5` (use 0.5px sempre que possível) |
| `--accent` (azul corp.) | `#1E40AF` |
| `--accent-soft` | `#EEF2FF` |
| `--status-open` | `#16A34A` |
| `--status-busy` | `#CA8A04` |

### Cores — Modo Escuro
| Token | Valor |
|---|---|
| `--bg` | `#0A0A0B` |
| `--surface` | `#131316` |
| `--surface-2` | `#1A1A1E` |
| `--surface-3` | `#202024` |
| `--text` | `#F5F5F4` |
| `--text-2` | `#A1A1AA` |
| `--text-3` | `#71717A` |
| `--border` | `#2A2A2E` |
| `--accent` | `#3B82F6` |
| `--accent-soft` | `#1E2A4A` |
| `--status-open` | `#22C55E` |
| `--status-busy` | `#EAB308` |

### Paletas categóricas (tags, avatares por hash de nome)
| Paleta | bg claro / fg claro | bg escuro / fg escuro |
|---|---|---|
| blue | `#EEF2FF` / `#1E3A8A` | `#1E2A4A` / `#BFDBFE` |
| purple | `#F3E8FF` / `#5B21B6` | `#2E1F44` / `#DDD6FE` |
| coral | `#FFE4E1` / `#9F1239` | `#3F1D24` / `#FECDD3` |
| teal | `#CCFBF1` / `#115E59` | `#133A35` / `#99F6E4` |
| stone | `#F1F0EE` / `#0A0A0A` | `#202024` / `#F5F5F4` |

### Tipografia
- **Família**: Inter (Google Fonts), pesos **400 e 500** apenas. NUNCA 600/700.
- **H1**: 22px / 500 / letter-spacing -0.015em
- **H2**: 18px / 500 / letter-spacing -0.01em
- **Body**: 14–15px / 400 / line-height 1.6
- **Valor por hora (destaque)**: 22–24px / 500 / letter-spacing -0.02em — esse é o número que vende
- **Tiny / metas**: 12px / 400
- **Sentence case sempre**. Sem ALL CAPS, sem Title Case.

### Espaçamento, raios, bordas
- Container max-width: **1200px**, padding lateral 24px
- Card: borda **0.5px** `--border`, radius **12px**, padding 16–24px, fundo `--surface`, **sem sombra**
- Botão: altura 36px, radius 8px, borda 0.5px
- Pill (filtro/toggle): altura 30px, radius 999px, borda 0.5px; ativo ganha borda 1px `--text`
- Badge skill: altura 18px, radius 4px, fonte 10.5px / 500
- Tag categoria: altura 22px, radius 999px, fonte 11.5px / 500
- Status dot: **círculo 7px**, perfeito
- Selo verificado: ícone check num círculo `--accent` 14px, ao lado do nome

### Sombras / efeitos proibidos
- Sem gradientes
- Sem sombras decorativas, glow, neon, glass-morphism
- Sem emojis na UI (use SVG inline / lucide-react 12–16px)
- Sem ilustrações de stock

## Screens

### `/` Landing
- **Topbar**: logo (quadrado preto 26px com símbolo "A"), botões Entrar (ghost) e Criar conta (primary), toggle sol/lua para tema.
- **Hero**: H1 56px / 500 / letter-spacing -0.025em, máx 880px ("Pentest sob demanda. Direto com quem invade."). Subtítulo 17px `--text-2`. Dois CTAs: primary "Sou empresa" → `/app/pentesters`, secundário "Sou pentester" → `/app/propostas`. Linha de selos abaixo (NDA padrão, Selo azul, Pagamento em escrow) com ícones 13px.
- **Duo grid 2 col**: dois cards lado a lado — "Para empresas" e "Para pentesters". Cada um tem eyebrow 12px, título 22px, lista com checks 14px e CTA secundário ao final.
- **Stats row**: 4 colunas — 312 pentesters / 1.847 projetos / R$ 287 rate médio / 4,8 avaliação média (números 28px/500, label 13px muted).
- **Footer**: borda topo 0.5px, logo + copyright em 12px muted.

### `/login` e `/cadastro`
- Card centralizado, max-width 420px, padding 32px.
- Tabs pill toggle: Entrar / Criar conta.
- Cadastro mostra seleção de tipo de conta (Empresa | Pentester) como duas pills.
- Inputs altura 38px, label 13px muted, placeholder cinza.
- Botão primário full-width.

### `/app/pentesters` — Catálogo
- **Layout**: sidebar 240px à esquerda + main flex.
- **Sidebar de filtros** (cada seção separada por borda 0.5px, padding vertical 18px):
  - Buscar (input com lupa 13px)
  - Disponibilidade (checkboxes "Só aberto", "Só verificados")
  - Valor por hora — slider R$ 180–500
  - Especialidades (checkboxes com count à direita, 10 itens)
  - Certificações (checkboxes, 10 itens)
- **Header da main**: H1 "Pentesters" + count + select de ordenação (Mais relevantes / Menor valor/hora / Maior rating / Mais projetos).
- **Grid**: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`, gap 12px.

### Card de pentester (componente-chave)
Estrutura vertical, padding 16px, gap 12px, posição relativa:
1. **Dot de status absoluto** top-right (7px verde/âmbar)
2. **Head**: avatar 36px (cor por hash do nome) + nome 14px/500 + selo verificado azul + linha de especialidade em 12px muted ("Web · Mobile")
3. **Rate**: R$ 280 em **23px / 500 / -0.02em** + "/h" 12px muted alinhado à baseline
4. **Certs**: badges OSCP/CRTP/etc, gap 4px, máx 4
5. **Footer com borda topo 0.5px**: estrela 11px + rating + "·" + nº projetos + "·" + cidade, tudo 12px

Hover: `border-color: var(--text-3)`.

### `/app/pentesters/:id` — Perfil pentester
- Botão "Voltar ao catálogo" ghost
- **Card head**: avatar XL 88px + nome H1 + verificado + handle/desde + linha com status dot, rating, cidade. À direita: rate em 22px destacado.
- **Bio**: parágrafo 15px
- **Especialidades**: chips pill
- **Certificações**: cada uma como linha com check azul + nome + "verificada"
- **Idiomas**: lista inline
- **Projetos recentes**: 3 itens com título, empresa, data, rating
- **Aside direito 320px**:
  - Card disponibilidade + botão primary "Enviar proposta direta" (abre modal) + botão secundário "Salvar perfil" + texto resposta média
  - Card estatísticas: projetos concluídos / taxa conclusão / resposta a propostas / reportes entregues

Modal de envio: overlay `--modal-overlay`, card 480px com inputs título, escopo, budget, prazo, botões Cancelar/Enviar.

### `/app/propostas` — Catálogo de propostas
- Mesma sidebar (Modalidade Remoto/Presencial, Budget mínimo slider, Tipo de teste Black/Gray/White, Categorias).
- **Lista vertical de cards horizontais** — não grid.

### Card de proposta (componente-chave)
Grid `1fr auto`, gap 12×24:
- Esquerda: **título 15px / 500**, meta linha 12.5px (empresa · setor · "há 3 horas")
- Direita: **budget 16px / 500 / -0.01em** + "prazo · tipo de teste" 12px muted
- Linha de tags abaixo (full width): categorias coloridas + "X candidaturas" stone

Cores das tags por categoria: Web app/API → blue, Mobile → purple, Red team/Eng. social → coral, Cloud/IoT → teal.

### `/app/propostas/:id`
- Tags + título H1 26px + meta linha (avatar empresa, "há X horas", candidaturas)
- Card com **Escopo**, **Requisitos** (bullets), **Como será o trabalho** (ol)
- Aside: card budget grande + CTA Candidatar-se (vira "Candidatura enviada" disabled após click) + card empresa com rating, projetos, tempo de resposta

### `/app/dashboard` (varia por tipo)
**Empresa**: 4 stats (contratações, propostas, candidaturas, em escrow) + card "Candidaturas na sua proposta" (lista de pentesters com avatar, nome, spec, rate, "candidatou-se há Xh", botão Ver perfil) + card "Contratações em andamento" (barra de progresso azul) + card "Atalhos".

**Pentester**: card status (status atual / rate / faturamento / próximo pagamento) + 4 stats (candidaturas, projeto ativo, convites, rating) + card "Propostas que combinam com seu perfil" (lista) + card "Convites diretos".

**Admin**: redireciona para `/admin`.

### `/admin`
Layout grid 220px sidebar + main:
- **Sidebar nav**: Visão geral / Verificações (com badge de contagem accent) / Usuários / Comissões / Moderação
- **Visão geral**: 4 stats + gráfico de barras receita 12 meses (última barra accent, demais `--surface-3`)
- **Verificações**: tabela com Pentester / Cert / Enviado / Arquivo / botões Rejeitar (ghost) e Aprovar (primary)
- **Usuários**: tabela
- **Comissões**: 3 stats + tabela projeto/empresa/pentester/valor/comissão (8%)

### `/app/perfil`
**Pentester**: avatar, nome, verificado / toggle status (Aberto verde / Em projeto âmbar) + slider valor por hora + textarea bio + cidade + idiomas + chips especialidades + chips certs com selo + botão Salvar.
**Empresa**: dados cadastrais + sobre.

## Interactions & Behavior
- **Topbar toggle**: pill "Pentesters / Propostas" persiste a aba ativa enquanto o usuário está em `/app/*`. Item ativo `--surface` com sombra 0.5px sutil; inativos transparentes / `--text-2`.
- **Tema**: clique no sol/lua na topbar alterna `dark`/`light` em `<html>` e persiste em localStorage. Animação não obrigatória.
- **Filtros**: aplicados ao vivo ao alterar checkboxes/sliders; nenhum botão "Aplicar".
- **Card click**: navega para o detalhe (cursor pointer, hover muda `border-color`).
- **Candidatar-se**: muda o botão para disabled "Candidatura enviada" + dispara toast.
- **Modal de proposta direta**: overlay com fade 160ms; click fora fecha; Esc fecha.
- **Toast**: aparece bottom center, slide-up 200ms, auto-dismiss 2.2s, `--toast-bg`/`--toast-fg`.
- **Account switch (apenas para protótipo)**: troca a "conta" entre empresa/pentester/admin sem persistência. No app real isso vem do login.

## State Management (Zustand sugerido)

```js
// useAuth.js
{
  account: 'empresa' | 'pentester' | 'admin' | null,
  user: { ... },
  login(account), logout()
}

// useTheme.js
{ theme: 'light' | 'dark', toggle() }

// useFilters.js (por catálogo)
{ query, especialidades:Set, certs:Set, maxRate, onlyOpen, verifiedOnly, sort, ... }
```

## Mock data
Veja `data.js` neste pacote — 12 pentesters, 8 propostas, 5 verificações pendentes em pt-BR. Use como seed; ajuste para sua necessidade.

## Files neste pacote
- `AegisHub.html` — entrypoint do protótipo (carrega tudo via Babel inline)
- `styles.css` — tokens completos (claro + escuro) + componentes
- `data.js` — mock data pt-BR
- `icons.jsx` — set de ícones lucide-style (use `lucide-react` no projeto real)
- `components.jsx` — Topbar, Avatar, Verified, StatusDot, Logo, PentesterCard, PropostaCard, Toast
- `pages-public.jsx` — Landing, Auth
- `pages-catalog.jsx` — PentestersCatalog, PropostasCatalog, CheckboxRow
- `pages-detail.jsx` — PentesterDetail, PropostaDetail, PerfilUser
- `pages-dash-admin.jsx` — Dashboard (3 variações), Admin
- `app.jsx` — router por hash + integração Tweaks
- `tweaks-panel.jsx` — não portar (é só do protótipo)

Para abrir o protótipo localmente: sirva a pasta com qualquer servidor estático (`npx serve .` ou `python -m http.server`) e acesse `AegisHub.html`. Não abra como `file://` — o Babel não carregará os scripts.

## Não-negociáveis (resumo)
1. Pesos 400 e 500 apenas
2. Sentence case sempre
3. Bordas 0.5px (use `border: 0.5px solid var(--border)` ou no Tailwind: `border-[0.5px] border-[--border]`)
4. Radius 12px nos cards, sem sombra
5. Accent azul `#1E40AF` (claro) / `#3B82F6` (escuro) **só** em CTAs primários e selo verificado
6. Status dot 7px
7. Sem gradientes, sem emoji, sem stock illustration
8. Conteúdo (cards, valor/hora, certs) é o protagonista visual
