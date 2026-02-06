# Arquitetura de Redesign: Glass + Calm

Este documento detalha o plano técnico para a implementação do novo sistema de design "Glass + Calm" no aplicativo Assist (Fluxo de Caixa Pessoal).

## 1. Estrutura de Tokens de Design

A implementação dos tokens será feita diretamente no `tailwind.config.js`, substituindo ou estendendo a paleta atual para refletir a nova identidade.

### 1.1 Cores (Calm Color System)

Substituiremos a estrutura semântica atual (`primary`, `secondary`, `neutral`) pelos nomes da nova marca para garantir consistência, mas manteremos aliases semânticos para facilitar o uso nos componentes.

```javascript
// tailwind.config.js
colors: {
  // Brand Base
  ink: {
    DEFAULT: '#0B1220', // Texto principal
    light: '#1A2333',
  },
  slate: {
    DEFAULT: '#5B667A', // Texto secundário
    light: '#8D99AE',
  },
  mist: {
    DEFAULT: '#F6F8FB', // Background principal
    dark: '#E2E6EA',
  },
  
  // Brand Accents
  teal: {
    DEFAULT: '#2EC4B6', // Primary / Ação / Voz
    hover: '#25A094',
    light: '#E0F7F6', // Backgrounds de tint
  },
  blue: {
    DEFAULT: '#3A86FF', // Info
    light: '#E6F0FF',
  },
  amber: {
    DEFAULT: '#FFBE0B', // Atenção
    light: '#FFF8E1',
  },
  rose: {
    DEFAULT: '#FF5C8A', // Alerta / Risco / Expense
    light: '#FFF0F4',
  },
  emerald: {
    DEFAULT: '#22C55E', // Positivo / Income
    light: '#E6F8ED',
  },

  // Semantic Aliases (Mapeamento para facilitar refatoração)
  background: '#F6F8FB', // Mist
  surface: 'rgba(255, 255, 255, 0.55)', // Glass base (usar com backdrop-blur)
  primary: '#2EC4B6', // Teal
  text: {
    primary: '#0B1220', // Ink
    secondary: '#5B667A', // Slate
  },
}
```

### 1.2 Tipografia (Mobile-first)

Configuração ajustada para legibilidade e hierarquia clara.

```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'], // Manter Inter ou migrar para SF Pro/Outfit se desejado
},
fontSize: {
  // Mobile-first sizes
  'caption': ['12px', { lineHeight: '16px' }],
  'body': ['16px', { lineHeight: '24px' }],
  'h2': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
  'h1': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
  
  // Monetary specific
  'balance': ['36px', { lineHeight: '1', fontWeight: '600', letterSpacing: '-0.03em' }],
}
```

### 1.3 Glassmorphism & Shadows

Tokens específicos para o efeito de vidro contido.

```javascript
backgroundImage: {
  'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
},
backdropBlur: {
  'glass': '12px',
},
boxShadow: {
  'glass': '0 4px 24px -1px rgba(0, 0, 0, 0.04), 0 0 1px 0 rgba(0, 0, 0, 0.06)',
  'glass-hover': '0 8px 32px -2px rgba(0, 0, 0, 0.08), 0 0 1px 0 rgba(0, 0, 0, 0.08)',
  'float-button': '0 12px 36px -4px rgba(46, 196, 182, 0.35)', // Teal shadow para o botão de voz
}
```

## 2. Sistema de Temas e Estilos Globais

### 2.1 Reset e Base (`index.css`)

Focaremos em um background global "Mist" e text color "Ink" por padrão.

```css
@layer base {
  body {
    @apply bg-mist text-ink antialiased;
    /* Smooth scrolling & tap highlights */
    -webkit-tap-highlight-color: transparent;
  }
}
```

### 2.2 Utilitários de Componente (`layer-components`)

Para padronizar o efeito Glass sem repetir classes.

```css
@layer components {
  .card-glass {
    @apply bg-white/55 backdrop-blur-glass border border-white/40 shadow-glass rounded-2xl;
  }
  
  .card-glass-interactive {
    @apply card-glass transition-all duration-300 hover:shadow-glass-hover hover:bg-white/65 active:scale-[0.98];
  }
}
```

## 3. Arquitetura de Componentes

### 3.1 Novos Componentes "Glass"

A estrutura dos componentes deve ser atualizada para remover backgrounds sólidos (ex: `bg-white`) e adotar o estilo translúcido.

**Estrutura de um Card:**
- Container: `.card-glass`
- Header: Título em `text-ink` (font-medium), Subtítulo em `text-slate`.
- Body: Conteúdo com espaçamento generoso (`p-5` ou `p-6`).

### 3.2 O "Hero" (Voice Dock)

Este é o elemento central. Não será apenas um botão flutuante padrão (FAB).
- **Posição:** Fixo no bottom (dock), centralizado ou full-width com container.
- **Visual:** Botão circular grande ou pílula expandida.
- **Cor:** Gradient Teal ou Teal sólido com shadow `float-button`.
- **Interação:** Animação de "onda" ao ouvir.

## 4. Estratégia de Responsividade

**Mobile-First Strict:**
1.  Todo o design é pensado para telas de 360-390px de largura primeiro.
2.  **Touch targets:** Mínimo de 44px para todos os botões.

**Breakpoints:**
- `md` (Tablet): Grid de 2 colunas para cards de dashboard.
- `lg` (Desktop): Layout centralizado com max-width (ex: `max-w-md` ou `max-w-lg` no centro da tela), simulando a experiência mobile app ("App Shell"), ou dashboard expandido se o usuário desktop for prioridade secundária. *Recomendação: Manter a experiência focada como app mobile mesmo no desktop, centralizado.*

## 5. Plano de Migração

A migração será feita em fases para não quebrar a aplicação atual.

### Fase 1: Fundação (Tokens e Config)
1.  [ ] Atualizar `tailwind.config.js` com as novas cores (Ink, Slate, Mist, Teal...).
2.  [ ] Criar classes utilitárias `.card-glass` em `index.css`.
3.  [ ] Definir a tipografia base.
4.  [ ] Alterar o `body` background para `Mist`.

### Fase 2: Componentes Atômicos
1.  [ ] **Button:** Refatorar para usar variantes `teal` (primary), `glass` (secondary). Remover variants antigas.
2.  [ ] **Input/Select:** Remover bordas pesadas, usar fundo `white/50` e focus ring `teal`.
3.  [ ] **Typography:** Atualizar componentes de Heading/Text para usar as cores `ink` e `slate`.

### Fase 3: Componentes Estruturais (Layout)
1.  [ ] **Layout Container:** Garantir padding e max-width corretos.
2.  [ ] **Header/Navbar:** Simplificar, possivelmente remover cor de fundo sólida ou torná-la glass.
3.  [ ] **Bottom Navigation:** Se existir, converter para style Glass ou substituir pelo Voice Dock se for a estratégia.

### Fase 4: O "Hero" (Voz)
1.  [ ] Criar/Atualizar `VoiceTransactionButton`.
2.  [ ] Implementar animações de estado (Listening, Processing).
3.  [ ] Posicionar como Dock fixo na base.

### Fase 5: Páginas (Refatoração Visual)
1.  [ ] **Dashboard:** Migrar cards de resumo e lista recente para `card-glass`.
2.  [ ] **Transactions:** Atualizar lista para item visualmente mais limpo.
3.  [ ] **Login:** Atualizar para estética "Calm" (clean, foco no logo e entrada).

## 6. Inventário de Componentes

### Novos Componentes a Criar
- `GlassCard`: Wrapper padrão para o estilo de vidro.
- `VoiceDock`: Container fixo inferior para o botão de voz.
- `PageHeader`: Cabeçalho padrão com título grande e actions transparentes.
- `StatusBadge`: Badges pílula com cores semânticas (bg-emerald-light + text-emerald).

### Modificações em Componentes Existentes
- `Button.tsx`:
  - `variant="primary"` -> `bg-teal text-white shadow-lg`
  - `variant="outline"` -> `border-slate/20 text-slate hover:bg-slate/5`
  - `variant="ghost"` -> `text-slate hover:text-ink`
- `Card.tsx`: Substituir `bg-white shadow` por `card-glass`.
- `TransactionItem`: Aumentar altura da linha, melhorar tipografia de valor (Ink) e data (Slate).
- `VoiceTransactionButton`: Redesign completo para ser o "Hero".

---
*Este plano está pronto para ser quebrado em tarefas individuais no quadro de projeto.*
