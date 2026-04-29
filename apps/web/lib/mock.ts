/**
 * Mock data — pt-BR. Frontend-only seed enquanto não há backend.
 * Quando a API Django estiver de pé, este módulo dará lugar a chamadas via /api/proxy.
 */

export type Palette = "blue" | "purple" | "coral" | "teal" | "stone";

export type PentesterStatus = "open" | "busy";

export type Pentester = {
  id: string;
  nome: string;
  handle: string;
  bio: string;
  especialidades: string[];
  certs: string[];
  rate: number;
  status: PentesterStatus;
  verificado: boolean;
  rating: number;
  projetos: number;
  cidade: string;
  desde: number;
  idiomas: string[];
  color: Palette;
  iniciais: string;
  specShort: string;
};

export type Categoria = { label: string; tone: Palette };

export type TipoTeste = "Black-box" | "Gray-box" | "White-box";

export type Proposta = {
  id: string;
  titulo: string;
  empresa: string;
  empresaTipo: string;
  empresaColor: Palette;
  categorias: Categoria[];
  budget: number;
  prazo: string;
  escopo: string;
  requisitos: string[];
  publicado: string;
  candidaturas: number;
  tipoTeste: TipoTeste;
  remoto: boolean;
};

export type Verificacao = {
  id: string;
  user: string;
  cert: string;
  enviado: string;
  arquivo: string;
};

export type EmpresaUser = {
  nome: string;
  handle: string;
  color: Palette;
  iniciais: string;
  cnpj: string;
  setor: string;
  tamanho: string;
  cidade: string;
  contratacoesAtivas: number;
  propostasAbertas: number;
};

export type AdminUser = {
  nome: string;
  iniciais: string;
  color: Palette;
};

const palettes: Palette[] = ["blue", "purple", "coral", "teal", "stone"];

export function hashColor(name: string): Palette {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return palettes[h % palettes.length] ?? "stone";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();
}

export const especialidades = [
  "Web app",
  "Mobile",
  "API / Backend",
  "Cloud (AWS/GCP/Azure)",
  "Red team",
  "Engenharia social",
  "IoT / Hardware",
  "Active Directory",
  "Análise de código",
  "OT / SCADA",
];

export const certificacoes = [
  "OSCP",
  "OSEP",
  "OSWE",
  "CRTP",
  "CRTO",
  "CEH",
  "AWS Security",
  "eWPTX",
  "PNPT",
  "GPEN",
];

export const cidades = [
  "São Paulo, SP",
  "Rio de Janeiro, RJ",
  "Belo Horizonte, MG",
  "Curitiba, PR",
  "Porto Alegre, RS",
  "Recife, PE",
  "Florianópolis, SC",
  "Brasília, DF",
  "Fortaleza, CE",
  "Remoto",
];

type RawPentester = Omit<Pentester, "color" | "iniciais" | "specShort">;

const rawPentesters: RawPentester[] = [
  {
    id: "p1",
    nome: "Mariana Albuquerque",
    handle: "@mari.alb",
    bio: "Especialista em web e API security. 7 anos quebrando aplicações de fintechs e e-commerces.",
    especialidades: ["Web app", "API / Backend", "Análise de código"],
    certs: ["OSCP", "OSWE", "eWPTX"],
    rate: 320,
    status: "open",
    verificado: true,
    rating: 4.9,
    projetos: 47,
    cidade: "São Paulo, SP",
    desde: 2019,
    idiomas: ["Português", "Inglês", "Espanhol"],
  },
  {
    id: "p2",
    nome: "Rafael Tavares",
    handle: "@r4f4",
    bio: "Red team e engenharia social. Ex-ofensivo em equipe interna de banco.",
    especialidades: ["Red team", "Engenharia social", "Active Directory"],
    certs: ["OSCP", "CRTO", "CRTP"],
    rate: 420,
    status: "busy",
    verificado: true,
    rating: 5.0,
    projetos: 34,
    cidade: "Rio de Janeiro, RJ",
    desde: 2017,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p3",
    nome: "Beatriz Camargo",
    handle: "@bia.sec",
    bio: "Mobile (iOS/Android) e análise estática de binários.",
    especialidades: ["Mobile", "Análise de código"],
    certs: ["OSCP", "eWPTX"],
    rate: 280,
    status: "open",
    verificado: true,
    rating: 4.8,
    projetos: 29,
    cidade: "Curitiba, PR",
    desde: 2020,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p4",
    nome: "João Henrique Souza",
    handle: "@joaohs",
    bio: "Cloud security em AWS e GCP. Foco em IAM, redes e configurações.",
    especialidades: ["Cloud (AWS/GCP/Azure)", "API / Backend"],
    certs: ["AWS Security", "OSCP"],
    rate: 360,
    status: "open",
    verificado: true,
    rating: 4.9,
    projetos: 22,
    cidade: "Florianópolis, SC",
    desde: 2021,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p5",
    nome: "Letícia Vasconcelos",
    handle: "@leti.v",
    bio: "Pentest interno, AD e movimentação lateral. CTF player do time inverso.",
    especialidades: ["Active Directory", "Red team"],
    certs: ["CRTP", "CRTO", "OSEP"],
    rate: 380,
    status: "open",
    verificado: true,
    rating: 4.9,
    projetos: 31,
    cidade: "Brasília, DF",
    desde: 2018,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p6",
    nome: "Diego Antunes",
    handle: "@diegoa",
    bio: "Web e API. Apaixonado por bug bounty nas horas vagas.",
    especialidades: ["Web app", "API / Backend"],
    certs: ["OSCP", "eWPTX"],
    rate: 240,
    status: "open",
    verificado: false,
    rating: 4.7,
    projetos: 18,
    cidade: "Belo Horizonte, MG",
    desde: 2022,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p7",
    nome: "Camila Ferraz",
    handle: "@cfz",
    bio: "IoT, hardware e firmware. Reversa de dispositivos embarcados.",
    especialidades: ["IoT / Hardware", "Análise de código"],
    certs: ["OSCP"],
    rate: 340,
    status: "busy",
    verificado: true,
    rating: 4.8,
    projetos: 12,
    cidade: "Recife, PE",
    desde: 2020,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p8",
    nome: "Gustavo Pacheco",
    handle: "@guspac",
    bio: "Web, mobile e cloud. Generalista experiente.",
    especialidades: ["Web app", "Mobile", "Cloud (AWS/GCP/Azure)"],
    certs: ["OSCP", "AWS Security"],
    rate: 300,
    status: "open",
    verificado: true,
    rating: 4.8,
    projetos: 41,
    cidade: "São Paulo, SP",
    desde: 2018,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p9",
    nome: "Tainá Moraes",
    handle: "@taina.m",
    bio: "Red team com forte componente de phishing e OSINT.",
    especialidades: ["Red team", "Engenharia social"],
    certs: ["CRTO", "OSEP", "PNPT"],
    rate: 400,
    status: "open",
    verificado: true,
    rating: 5.0,
    projetos: 26,
    cidade: "Porto Alegre, RS",
    desde: 2019,
    idiomas: ["Português", "Inglês", "Francês"],
  },
  {
    id: "p10",
    nome: "Vinícius Barreto",
    handle: "@vbarreto",
    bio: "Web e API. Em transição para red team.",
    especialidades: ["Web app", "API / Backend"],
    certs: ["OSCP"],
    rate: 220,
    status: "open",
    verificado: false,
    rating: 4.6,
    projetos: 9,
    cidade: "Fortaleza, CE",
    desde: 2023,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p11",
    nome: "Helena Drummond",
    handle: "@helenad",
    bio: "OT/SCADA e infraestrutura crítica. Atende energia e saneamento.",
    especialidades: ["OT / SCADA", "IoT / Hardware"],
    certs: ["OSCP", "GPEN"],
    rate: 450,
    status: "busy",
    verificado: true,
    rating: 4.9,
    projetos: 14,
    cidade: "Remoto",
    desde: 2017,
    idiomas: ["Português", "Inglês"],
  },
  {
    id: "p12",
    nome: "Eduardo Pires",
    handle: "@edupir",
    bio: "Mobile Android e revisão de código.",
    especialidades: ["Mobile", "Análise de código"],
    certs: ["CEH", "eWPTX"],
    rate: 260,
    status: "open",
    verificado: true,
    rating: 4.7,
    projetos: 23,
    cidade: "São Paulo, SP",
    desde: 2020,
    idiomas: ["Português", "Inglês"],
  },
];

export const pentesters: Pentester[] = rawPentesters.map((p) => ({
  ...p,
  color: hashColor(p.nome),
  iniciais: initials(p.nome),
  specShort: p.especialidades
    .slice(0, 2)
    .map((s) => (s.split(" ")[0] ?? s).replace("/", ""))
    .join(" · "),
}));

export const propostas: Proposta[] = [
  {
    id: "pr1",
    titulo: "Pentest black-box em plataforma de open finance",
    empresa: "Banco Lumen",
    empresaTipo: "Fintech",
    empresaColor: "blue",
    categorias: [
      { label: "Web app", tone: "blue" },
      { label: "API", tone: "blue" },
    ],
    budget: 38000,
    prazo: "4 semanas",
    escopo:
      "Aplicação SPA + 24 endpoints REST + autenticação OAuth + escopo limitado de mobile (companion app).",
    requisitos: [
      "OSCP ou equivalente",
      "Experiência em open finance / PIX",
      "NDA obrigatório",
    ],
    publicado: "há 3 horas",
    candidaturas: 8,
    tipoTeste: "Black-box",
    remoto: true,
  },
  {
    id: "pr2",
    titulo: "Avaliação de superfície externa + AD interno",
    empresa: "Construtora Itacira",
    empresaTipo: "Construção",
    empresaColor: "stone",
    categorias: [
      { label: "Red team", tone: "coral" },
      { label: "Active Directory", tone: "stone" },
    ],
    budget: 62000,
    prazo: "6 semanas",
    escopo:
      "Reconhecimento externo + acesso assumido em estação Windows + AD com ~800 contas.",
    requisitos: ["CRTP / CRTO", "Disponibilidade para visita em SP"],
    publicado: "há 1 dia",
    candidaturas: 14,
    tipoTeste: "Gray-box",
    remoto: false,
  },
  {
    id: "pr3",
    titulo: "Pentest mobile em app de delivery (iOS + Android)",
    empresa: "Sabor Express",
    empresaTipo: "Delivery",
    empresaColor: "coral",
    categorias: [{ label: "Mobile", tone: "purple" }],
    budget: 22000,
    prazo: "3 semanas",
    escopo:
      "App nativo iOS, app Android (Kotlin), backend não está no escopo.",
    requisitos: ["Experiência iOS + Android", "Frida / Objection"],
    publicado: "há 2 dias",
    candidaturas: 11,
    tipoTeste: "Gray-box",
    remoto: true,
  },
  {
    id: "pr4",
    titulo: "Revisão de configuração AWS multi-conta",
    empresa: "Cíclica Saúde",
    empresaTipo: "Healthtech",
    empresaColor: "teal",
    categorias: [{ label: "Cloud", tone: "teal" }],
    budget: 28000,
    prazo: "2 semanas",
    escopo:
      "12 contas AWS, foco em IAM, S3, KMS e VPCs. ScoutSuite + análise manual.",
    requisitos: ["AWS Security ou similar", "Experiência com Control Tower"],
    publicado: "há 4 horas",
    candidaturas: 5,
    tipoTeste: "White-box",
    remoto: true,
  },
  {
    id: "pr5",
    titulo: "Engenharia social + phishing dirigido a executivos",
    empresa: "Granito Capital",
    empresaTipo: "Investimentos",
    empresaColor: "purple",
    categorias: [
      { label: "Red team", tone: "coral" },
      { label: "Eng. social", tone: "coral" },
    ],
    budget: 18000,
    prazo: "2 semanas",
    escopo:
      "Campanha autorizada contra C-level (12 alvos). Pretexto livre.",
    requisitos: [
      "Histórico em campanhas autorizadas",
      "GoPhish ou equivalente",
    ],
    publicado: "há 5 dias",
    candidaturas: 9,
    tipoTeste: "Black-box",
    remoto: true,
  },
  {
    id: "pr6",
    titulo: "Pentest em SaaS de gestão escolar",
    empresa: "Tutorial Edu",
    empresaTipo: "Edtech",
    empresaColor: "blue",
    categorias: [
      { label: "Web app", tone: "blue" },
      { label: "API", tone: "blue" },
    ],
    budget: 16000,
    prazo: "3 semanas",
    escopo:
      "Painel admin, painel professor, painel aluno, mobile companion. ~60 endpoints.",
    requisitos: ["OSCP", "Disponibilidade integral"],
    publicado: "há 6 horas",
    candidaturas: 4,
    tipoTeste: "Gray-box",
    remoto: true,
  },
  {
    id: "pr7",
    titulo: "Avaliação de firmware em medidor inteligente",
    empresa: "Vértice Energia",
    empresaTipo: "Utilities",
    empresaColor: "teal",
    categorias: [
      { label: "IoT", tone: "teal" },
      { label: "Hardware", tone: "stone" },
    ],
    budget: 45000,
    prazo: "5 semanas",
    escopo:
      "Engenharia reversa de firmware (ARM Cortex-M), interfaces seriais, comunicação LoRaWAN.",
    requisitos: [
      "Reversa de binário",
      "Hardware hacking",
      "NDA crítico",
    ],
    publicado: "há 1 dia",
    candidaturas: 3,
    tipoTeste: "White-box",
    remoto: false,
  },
  {
    id: "pr8",
    titulo: "Pentest de API GraphQL em B2B SaaS",
    empresa: "Norte Logística",
    empresaTipo: "Logística",
    empresaColor: "stone",
    categorias: [{ label: "API", tone: "blue" }],
    budget: 14000,
    prazo: "2 semanas",
    escopo:
      "API GraphQL com 90+ resolvers. Autenticação por JWT.",
    requisitos: ["Experiência em GraphQL", "Burp/InQL"],
    publicado: "há 8 horas",
    candidaturas: 6,
    tipoTeste: "Gray-box",
    remoto: true,
  },
];

export const verificacoes: Verificacao[] = [
  { id: "v1", user: "Diego Antunes", cert: "OSCP", enviado: "há 2 dias", arquivo: "oscp-cert.pdf" },
  { id: "v2", user: "Vinícius Barreto", cert: "OSCP", enviado: "há 1 dia", arquivo: "oscp-cert.pdf" },
  { id: "v3", user: "Sofia Reali", cert: "CRTP", enviado: "há 3 dias", arquivo: "crtp.pdf" },
  { id: "v4", user: "Bruno Eça", cert: "AWS Security", enviado: "há 5 horas", arquivo: "aws-sec.pdf" },
  { id: "v5", user: "Diego Antunes", cert: "eWPTX", enviado: "há 2 dias", arquivo: "ewptx.pdf" },
];

export const empresaUser: EmpresaUser = {
  nome: "Banco Lumen",
  handle: "@bancolumen",
  color: "blue",
  iniciais: "BL",
  cnpj: "23.451.882/0001-09",
  setor: "Fintech",
  tamanho: "120 funcionários",
  cidade: "São Paulo, SP",
  contratacoesAtivas: 2,
  propostasAbertas: 1,
};

export const pentesterUser: Pentester = pentesters[0]!;

export const adminUser: AdminUser = {
  nome: "Operações AegisHub",
  iniciais: "OA",
  color: "stone",
};

export function getPentester(id: string): Pentester | undefined {
  return pentesters.find((p) => p.id === id);
}

export function getProposta(id: string): Proposta | undefined {
  return propostas.find((p) => p.id === id);
}
