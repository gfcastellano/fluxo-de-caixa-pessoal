# Branding Guidelines (v1) — App de Finanças por Voz

---

## 1) Contexto de mercado (Brasil + Global) e implicações para a marca

### O que o mercado já educou o usuário a esperar (baseline)

- **Visão unificada**  
  (“todas as contas em um lugar”) e **sincronização bancária**  
  (Open Finance no Brasil; Open Banking/PSD2 na Europa; agregadores nos EUA).  
  Apps como Monarch e Mobills comunicam isso como promessa central (“home base”, “um só lugar”).

- **Categorias, limites e relatórios/insights**  
  Gráficos simples e relatórios claros como linguagem padrão do mercado.

- **Assinaturas e contas recorrentes**  
  Um dos maiores *pain killers*: calendário de contas, alertas, controle e cancelamento.  
  Rocket Money e Monarch dão destaque forte a recorrências.

- **Segurança como requisito básico de confiança**  
  2FA, criptografia, controle de acesso e transparência.  
  Hoje isso é considerado “higiene do produto”, não diferencial.

---

### Onde está a janela de diferenciação (o “moat”)

- **Entrada por voz / conversação como UX principal**  
  Não como funcionalidade extra.  
  Já existem apps nichados de “voice expense tracker” que comunicam isso claramente (“just speak”).

- A marca **não pode parecer apenas mais um app de planilha bonita**.  
  Ela deve parecer um **assistente de bolso**:
  - rápido  
  - leve  
  - confiável  

---

## 2) Posicionamento de Marca

- **Categoria:** Personal Finance Assistant  
  (mobile-first, voice-first)

- **Promessa curta:**  
  **“Fale. Registre. Entenda.”**

- **Proposta de valor:**  
  Controle financeiro com fricção mínima (voz + automações), com clareza visual, segurança e confiança.

- **Território emocional:**  
  Leveza + autonomia  
  (sem culpa, sem bronca, sem julgamento)

### Arquétipo de Marca (recomendado)

- **O Guia**  
  Clareza, direção, inteligência tranquila  

- Com toque de **O Cuidador**  
  Apoio, calma, acolhimento  

**Evitar:**  
- Professor severo  
- Coach agressivo  

---

## 3) Princípios de Produto que Viram Princípios de Marca

Estas regras são **não negociáveis** no design, produto e marketing.

### 1. Voice-first de verdade
- O app sempre oferece um **atalho de fala claro** (1 toque).
- A fala **não abre um formulário**:
  - interpreta  
  - confirma  
  - salva  
- A marca precisa vender isso em:
  - landing pages  
  - screenshots das lojas  
  - onboarding  

---

### 2. Clareza em camadas (não sobrecarregar)
- A home **não é um painel de BI**.
- A home é:
  - resumo  
  - próximos passos  
- Profundidade só quando o usuário pede (tap / scroll).

---

### 3. Sem vergonha, sem culpa
- Linguagem neutra:
  - “ajustar”
  - “recalibrar”
  - “entender”
  - “tendência”

- Nunca usar:
  - “você falhou”
  - “gasto ruim”
  - “você exagerou”

---

### 4. Confiança visível
- Transparência clara:
  - importado  
  - manual  
  - por voz  

- Controles explícitos:
  - exportar dados  
  - apagar dados  
  - gerenciar permissões  

---

## 4) Identidade Verbal (Tom de Voz)

- **Tom:** humano, objetivo, calmo, inteligente  
- **Ritmo:** frases curtas, microcopy útil, sem jargão  

### Exemplos corretos
- “Quer registrar por voz?”
- “Confere antes de salvar?”
- “Resumo do mês: você está **R$ 120 abaixo** do planejado.”

### Evitar
- “Parabéns!” (infantiliza)
- “Você gastou demais.” (culpa)

---

## 5) Identidade Visual — Direção Geral

Direção baseada em **leveza, vidro e cores indicativas**, formando um:

> **Glass + Calm Color System**

---

### 5.1 Estilo (referência conceitual)

- **Glassmorphism contido**
  - blur e transparência apenas em cards e containers  
  - nunca efeito gratuito  

- **Luz suave**
  - sensação premium  
  - limpa  
  - tecnológica  

- **Cores funcionais**
  - cores indicam estado  
  - não são decorativas  

---

### 5.2 Paleta de Cores (v1)

#### Base (neutros)
- **Ink (texto):** `#0B1220`
- **Slate (texto secundário):** `#5B667A`
- **Mist (background):** `#F6F8FB`
- **Glass (cards):** `rgba(255,255,255,0.55)` + blur

#### Acentos (calmos e indicativos)
- **Teal (ação / primário):** `#2EC4B6`
- **Blue (informação):** `#3A86FF`
- **Amber (atenção):** `#FFBE0B`
- **Rose (alerta / risco):** `#FF5C8A`
- **Emerald (positivo):** `#22C55E`

**Regras de uso**
- Teal apenas em **CTA** e **ação de voz**
- Amber e Rose apenas quando houver motivo real

---

### 5.3 Tipografia (mobile-first)

- Sans moderna e altamente legível  
  (Inter, SF Pro, ou equivalente)

#### Hierarquia sugerida
- H1: 28–32
- H2: 20–24
- Body: 15–17
- Caption: 12–13

**Regra crítica:**  
Valores monetários sempre com **peso visual maior** que rótulos.

---

### 5.4 Iconografia

- Linha fina
- Cantos arredondados
- Ícones sempre semânticos
- A ação de voz possui:
  - ícone próprio  
  - brilho sutil  
  - nunca neon  

---

### 5.5 Motion & Microinterações

- Voz:
  - ondas suaves
  - 200–300ms  

- Confirmação:
  - “snap” leve
  - feedback háptico no mobile  

- Nunca usar animações longas ou chamativas

---

## 6) Sistema de Interface (UI) Orientado à Feature Principal

### 6.1 O “Hero” do Produto

- **Elemento principal:** botão de voz fixo (dock) + “tap to speak”

Regras:
- Deve ser o elemento mais reconhecível da marca
- Em marketing, funciona como símbolo (equivalente ao “play” do streaming)

---

### 6.2 Estrutura Recomendada (Mobile)

- **Home:**  
  Resumo + Próximas contas + 1 insight + CTA de voz

- **Timeline:**  
  Entradas por voz / importadas / manuais com filtros

- **Planejamento:**  
  Visões semanal, mensal e anual + metas

- **Projeções:**  
  3 e 6 meses (premium)

- **Assistente:**  
  Perguntas como “quanto gastei em X?” (premium / pro)

---

## 7) Funcionalidades por Faixa (Tiers)

### Free (aquisição)
- Registro manual e por voz limitado
- Categorias e relatórios básicos
- 1 conta ou carteira
- Exportação simples

### Plus
- Voz ilimitada
- Regras de categorização
- Alertas e recorrências
- Múltiplas contas

### Premium
- Conexão bancária (Open Finance / sync)
- Projeções 3 e 6 meses
- Metas avançadas
- Insights automáticos

### Pro
- Perguntas por linguagem natural (“pergunte ao seu dinheiro”)
- Planejamento por cenários
- Compartilhamento com parceiro ou consultor

---

## 8) Diretrizes de Marca para Marketing

### Mensagens principais
- “Seu controle financeiro por voz.”
- “Só fala. A gente organiza.”

### Provas visuais obrigatórias
- Screenshot do fluxo de voz completo
- Screenshot de resumo mensal
- Screenshot de projeções (premium)

### Linguagem de features
- Verbo + benefício + tempo curto

Exemplos:
- “Registre gastos em 3 segundos.”
- “Veja seu mês em 1 tela.”

---

## 9) Do’s & Don’ts

### Do
- Interface limpa
- Cards de vidro discretos
- Teal como assinatura de ação
- Feedback imediato após fala
- Transparência sobre origem dos dados

### Don’t
- Dashboard poluído
- Cores saturadas sem função
- Tom moralista
- Esconder como os dados foram capturados
