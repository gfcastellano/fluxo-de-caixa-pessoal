# 📋 Estudo Completo: Feature "Família" — Compartilhamento Granular de Dados Financeiros

> **Data:** 2026-02-12  
> **Status:** Estudo / Planejamento  
> **Autor:** AI Assistant  

---

## 📑 Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Arquitetura Atual](#2-arquitetura-atual)
3. [Modelo de Dados — Novas Coleções no Firestore](#3-modelo-de-dados--novas-coleções-no-firestore)
4. [Fluxo de Convite e Aceite](#4-fluxo-de-convite-e-aceite)
5. [Sistema de Permissões Granulares](#5-sistema-de-permissões-granulares)
6. [Firestore Security Rules](#6-firestore-security-rules)
7. [Alterações no Backend (Cloudflare Workers + Hono)](#7-alterações-no-backend-cloudflare-workers--hono)
8. [Alterações no Frontend (React + Vite)](#8-alterações-no-frontend-react--vite)
9. [Visão da "Family View" — Dashboard Compartilhado](#9-visão-da-family-view--dashboard-compartilhado)
10. [Plano de Implementação em Fases](#10-plano-de-implementação-em-fases)
11. [Riscos e Mitigações](#11-riscos-e-mitigações)
12. [Decisões de Design Pendentes](#12-decisões-de-design-pendentes)

---

## 1. Resumo Executivo

A feature "Família" permite que cada usuário mantenha seu **espaço pessoal completo** (contas, transações, cartões, orçamentos, categorias), mas possa **convidar outras pessoas** e escolher, de forma granular, **quais dados compartilhar** com elas.

### Cenários principais:
- **Compartilhar saldo de conta** mas NÃO as transações detalhadas
- **Compartilhar limite restante do cartão de crédito** mas NÃO as compras individuais
- **Compartilhar todas as contas + todas as transações** (modo transparência total)
- **Cada membro vê seu próprio ambiente** + um **painel de visão familiar** com os dados que lhe foram compartilhados

### Princípio Core:
> **Quem compartilha escolhe o quê.** O convidado só vê o que o dono decidiu expor. Nunca o contrário.

---

## 2. Arquitetura Atual

### 2.1 Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend API | Hono (Cloudflare Workers) |
| Banco de Dados | Firebase Firestore (REST API) |
| Autenticação | Firebase Auth (Google OAuth) |
| Deploy Frontend | Cloudflare Pages |
| Deploy Backend | Cloudflare Workers |

### 2.2 Coleções Firestore Atuais
```
accounts/         → userId, name, currency, balance, ...
budgets/          → userId, categoryId, amount, period, ...
categories/       → userId, name, type, color, ...
creditCards/      → userId, name, linkedAccountId, creditLimit, ...
transactions/     → userId, accountId, type, amount, categoryId, ...
users/            → {uid} → email, displayName, settings
userSettings/     → {uid} → voiceConsent, language, ...
```

### 2.3 Padrão de Segurança Atual
- Todos os documentos possuem campo `userId`
- Backend valida `userId` via `authMiddleware` (verifica JWT do Firebase Auth)
- Frontend filtra queries com `where('userId', '==', currentUser.uid)`
- Security Rules (temporárias) permitem acesso aberto com expiração

### 2.4 Pontos de acesso ao dado (que precisam ser adaptados)
| Camada | Arquivo | Uso de `userId` |
|--------|---------|-----------------|
| Backend Service | `backend/src/services/firebase.ts` → `getDocuments(collection, userId)` | Filtra por `userId` |
| Backend Routes | `backend/src/routes/accounts.ts` (e todos outros) | `c.get('userId')` do middleware |
| Frontend Service | `frontend/src/services/accountService.ts` (e todos outros) | `where('userId', '==', userId)` |
| Frontend Pages | `Dashboard.tsx`, `Transactions.tsx`, etc. | Usa `user.uid` |

---

## 3. Modelo de Dados — Novas Coleções no Firestore

### 3.1 Coleção `families`
```typescript
// families/{familyId}
interface Family {
  id: string;
  name: string;            // "Família Castellano"
  createdBy: string;       // userId do criador
  createdAt: string;       // ISO date
  updatedAt: string;
}
```

### 3.2 Coleção `familyMembers`
```typescript
// familyMembers/{memberId}
interface FamilyMember {
  id: string;
  familyId: string;        // Ref para families/{familyId}
  userId: string;          // Firebase Auth UID do membro
  email: string;           // Email do membro (para exibição)
  displayName: string;     // Nome para exibição
  photoURL?: string;       // Foto do perfil (Google)
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
  updatedAt: string;
}
```

### 3.3 Coleção `familyInvitations`
```typescript
// familyInvitations/{invitationId}
interface FamilyInvitation {
  id: string;
  familyId: string;
  invitedBy: string;       // userId de quem convidou
  invitedEmail: string;    // Email da pessoa convidada
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;       // Convite expira em 7 dias
  // Permissões pré-configuradas que o convidante define ANTES de enviar
  permissions: SharingPermissions;
}
```

### 3.4 Coleção `familySharing` (Permissões Granulares)
```typescript
// familySharing/{sharingId}
interface FamilySharing {
  id: string;
  familyId: string;
  ownerUserId: string;     // Quem está compartilhando (dono do dado)
  targetUserId: string;    // Com quem está compartilhando
  permissions: SharingPermissions;
  createdAt: string;
  updatedAt: string;
}

// O núcleo da granularidade
interface SharingPermissions {
  // === CONTAS ===
  accounts: {
    shareAll: boolean;         // Compartilhar todas as contas
    specificIds?: string[];    // OU compartilhar contas específicas
    showBalance: boolean;      // Exibir saldo atual
    showTransactions: boolean; // Exibir lista de transações
  };

  // === CARTÕES DE CRÉDITO ===
  creditCards: {
    shareAll: boolean;
    specificIds?: string[];
    showLimit: boolean;        // Exibir limite total
    showAvailable: boolean;    // Exibir quanto "resta" no limite
    showBillTotal: boolean;    // Exibir total da fatura
    showTransactions: boolean; // Exibir transações individuais do cartão
  };

  // === CATEGORIAS ===
  categories: {
    shareAll: boolean;         // Compartilhar todas as categorias
    specificIds?: string[];
  };

  // === ORÇAMENTOS ===
  budgets: {
    shareAll: boolean;
    specificIds?: string[];
    showSpent: boolean;        // Exibir quanto já foi gasto
    showRemaining: boolean;    // Exibir quanto resta
  };

  // === RELATÓRIOS ===
  reports: {
    shareOverview: boolean;    // Compartilhar visão geral (receitas/despesas totais)
    shareCategoryBreakdown: boolean; // Compartilhar por categoria
    shareTrends: boolean;      // Compartilhar tendências
  };
}
```

### 3.5 Diagrama de Relações
```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   families   │────▶│  familyMembers   │     │  familyInvitations  │
│  {familyId}  │     │ userId, familyId │     │ invitedEmail, status│
└──────────────┘     └──────────────────┘     └─────────────────────┘
                            │
                            ▼
                     ┌──────────────────┐
                     │  familySharing   │
                     │ ownerUserId      │
                     │ targetUserId     │
                     │ permissions: {...}│
                     └──────────────────┘
                            │
                  (permissões apontam para)
                            ▼
              ┌──────────────────────────┐
              │  accounts, creditCards,  │
              │  transactions, budgets,  │
              │  categories              │
              │  (dados do ownerUserId)  │
              └──────────────────────────┘
```

---

## 4. Fluxo de Convite e Aceite

### 4.1 Fluxo Completo

```
[Usuário A] → Configurações → Família
          │
          ▼
   "Convidar Membro" → Digita email do Usuário B
          │
          ▼
   Configura Permissões (o que compartilhar com B)
     ├── ☑ Compartilhar saldo das contas
     ├── ☐ Compartilhar transações das contas
     ├── ☑ Compartilhar limite restante do cartão
     ├── ☐ Compartilhar transações do cartão
     └── ☑ Compartilhar visão geral dos relatórios
          │
          ▼
   Cria documento em `familyInvitations` com status 'pending'
          │
          ▼
[Usuário B] → Faz login → Vê banner "Você tem um convite!"
          │
          ▼
   Aceita → Cria doc em `familyMembers` + `familySharing`
   Recusa → Atualiza status para 'declined'
          │
          ▼
[Usuário B] agora vê aba "Família" no Dashboard
   com os dados que A compartilhou
```

### 4.2 Notificação do Convite
- **Opção 1 (Simples):** Ao logar, o frontend faz query em `familyInvitations` onde `invitedEmail == user.email` e `status == 'pending'`. Se existir, exibe banner/toast.
- **Opção 2 (Futura):** Enviar email via Cloud Functions ou SendGrid.

---

## 5. Sistema de Permissões Granulares

### 5.1 Níveis de Compartilhamento

O sistema opera em **3 níveis de visibilidade** para cada tipo de dado:

| Nível | O que vê | Exemplo |
|-------|----------|---------|
| 🔒 **Nenhum** | Não vê nada daquele tipo | Cartões: desabilitado |
| 📊 **Resumo** | Vê totais/saldos, sem detalhe | Conta: saldo R$ 5.000, sem transações |
| 🔍 **Completo** | Vê tudo, incluindo transações | Conta: saldo + todas as transações |

### 5.2 Tabela de Permissões por Recurso

| Recurso | Nível Resumo | Nível Completo |
|---------|-------------|----------------|
| **Conta bancária** | Nome + Saldo | Nome + Saldo + Transações |
| **Cartão de crédito** | Nome + Limite Disponível | Nome + Limite + Fatura + Transações |
| **Orçamento** | Categoria + % gasto | Categoria + Valores + Detalhes |
| **Relatórios** | Total Receitas/Despesas | Breakdown por categoria |
| **Categorias** | Nomes | Nomes + Uso |

### 5.3 Matriz de Exemplo

```
Usuário A compartilha com Usuário B:
┌────────────────────┬─────────┬──────────────┬────────────────┐
│ Recurso            │ Visível │ Saldo/Resumo │ Transações     │
├────────────────────┼─────────┼──────────────┼────────────────┤
│ Conta Nubank       │   ✅    │     ✅       │      ❌        │
│ Conta Itaú         │   ✅    │     ✅       │      ✅        │
│ Cartão Nubank      │   ✅    │  Limite: ✅  │      ❌        │
│ Orçamento Mercado  │   ✅    │  Gasto: ✅   │      ❌        │
│ Relatório Geral    │   ✅    │     ✅       │      ❌        │
└────────────────────┴─────────┴──────────────┴────────────────┘
```

---

## 6. Firestore Security Rules

### 6.0 Estado Atual (Desenvolvimento)

> ⚠️ **As rules atuais estão intencionalmente abertas** para facilitar o desenvolvimento:
> ```
> allow read, write: if request.time < timestamp.date(2026, 3, 4);
> ```
> Durante o desenvolvimento da feature de família, podemos continuar com essas rules abertas.
> As rules abaixo são a **proposta para produção**, a ser implementada na Fase 5 (Segurança).

### 6.1 Regras Propostas para Produção

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ===== Funções auxiliares =====

    // Verifica se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Verifica se o documento pertence ao usuário
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Verifica se o campo userId é imutável na atualização
    function userIdUnchanged() {
      return request.resource.data.userId == resource.data.userId;
    }

    // Verifica se o usuário é membro ativo de uma família
    function isFamilyMember(familyId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)) &&
        get(/databases/$(database)/documents/familyMembers/$(familyId + '_' + request.auth.uid)).data.status == 'active';
    }

    // Verifica se o usuário tem permissão de sharing para dados de outro usuário
    function hasSharing(ownerUserId) {
      return isAuthenticated() &&
        // O sistema de sharing é validado no backend, não nas rules diretamente
        // Aqui apenas garantimos que o usuário está autenticado
        request.auth.uid != null;
    }

    // ===== Coleções de dados do usuário =====

    match /accounts/{docId} {
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid
        // Leitura via família é feita pelo backend que já filtra
      );
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) && userIdUnchanged();
      allow delete: if isOwner(resource.data.userId);
    }

    match /transactions/{docId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) && userIdUnchanged();
      allow delete: if isOwner(resource.data.userId);
    }

    match /categories/{docId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) && userIdUnchanged();
      allow delete: if isOwner(resource.data.userId);
    }

    match /budgets/{docId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) && userIdUnchanged();
      allow delete: if isOwner(resource.data.userId);
    }

    match /creditCards/{docId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) && userIdUnchanged();
      allow delete: if isOwner(resource.data.userId);
    }

    // ===== Coleções de usuário =====

    match /users/{uid} {
      allow read, write: if isAuthenticated() && request.auth.uid == uid;
    }

    match /userSettings/{uid} {
      allow read, write: if isAuthenticated() && request.auth.uid == uid;
    }

    // ===== Coleções de Família =====

    match /families/{familyId} {
      allow read: if isAuthenticated() && isFamilyMember(familyId);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && isFamilyMember(familyId);
      allow delete: if isAuthenticated() &&
        get(/databases/$(database)/documents/families/$(familyId)).data.createdBy == request.auth.uid;
    }

    match /familyMembers/{memberId} {
      allow read: if isAuthenticated();
      // Criação é feita pelo backend ao aceitar convite
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    match /familyInvitations/{invitationId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    match /familySharing/{sharingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
  }
}
```

> **Nota:** A validação granular de permissões é feita no **backend** (Hono/Cloudflare Workers), não nas Security Rules. As rules garantem apenas autenticação e ownership dos dados próprios. Os dados compartilhados são acessados via endpoints do backend que verificam o `familySharing`.

---

## 7. Alterações no Backend (Cloudflare Workers + Hono)

### 7.1 Novas Rotas

```
backend/src/routes/
├── families.ts              ← NOVO
├── familyInvitations.ts     ← NOVO
├── familySharing.ts         ← NOVO
├── accounts.ts              ← MODIFICADO (adicionar rota de leitura compartilhada)
├── transactions.ts          ← MODIFICADO
├── creditCards.ts           ← MODIFICADO
├── budgets.ts               ← MODIFICADO
└── ...
```

### 7.2 Arquivo `backend/src/routes/families.ts`

```typescript
// Endpoints:
// POST   /api/families                    → Criar família
// GET    /api/families                    → Listar famílias do usuário
// GET    /api/families/:id                → Detalhes da família
// PUT    /api/families/:id                → Atualizar família (nome)
// DELETE /api/families/:id                → Remover família (só owner)

// POST   /api/families/:id/invite         → Enviar convite
// GET    /api/families/invitations         → Listar convites pendentes (para mim)
// POST   /api/families/invitations/:id/accept  → Aceitar convite
// POST   /api/families/invitations/:id/decline → Recusar convite

// GET    /api/families/:id/members        → Listar membros
// DELETE /api/families/:id/members/:memberId → Remover membro

// GET    /api/families/:id/sharing        → Listar permissões
// PUT    /api/families/:id/sharing/:targetUserId → Atualizar permissões
```

### 7.3 Arquivo `backend/src/routes/familySharing.ts`

```typescript
// Endpoints para dados compartilhados (somente leitura):
// GET /api/family-data/:familyId/accounts         → Contas compartilhadas comigo
// GET /api/family-data/:familyId/credit-cards      → Cartões compartilhados
// GET /api/family-data/:familyId/budgets           → Orçamentos compartilhados
// GET /api/family-data/:familyId/transactions      → Transações compartilhadas
// GET /api/family-data/:familyId/summary           → Resumo geral da família
```

### 7.4 Lógica de Filtragem no Backend

O backend é o **gatekeeper** dos dados compartilhados. Quando o Usuário B pede "contas compartilhadas comigo na família X":

```typescript
// Pseudocódigo do endpoint GET /api/family-data/:familyId/accounts
async function getSharedAccounts(familyId: string, requestingUserId: string) {
  // 1. Verificar se o usuário é membro da família
  const membership = await getMembership(familyId, requestingUserId);
  if (!membership || membership.status !== 'active') throw 403;

  // 2. Buscar todas as regras de sharing onde targetUserId == requestingUserId
  const sharings = await getSharingsForTarget(familyId, requestingUserId);

  // 3. Para cada sharing (de cada membro que compartilhou comigo)
  const sharedAccounts = [];
  for (const sharing of sharings) {
    const ownerUserId = sharing.ownerUserId;
    const perms = sharing.permissions.accounts;

    if (!perms.shareAll && (!perms.specificIds || perms.specificIds.length === 0)) {
      continue; // Este membro não compartilhou contas comigo
    }

    // 4. Buscar contas do owner
    let accounts = await firebase.getDocuments('accounts', ownerUserId);

    // Filtrar por IDs específicos se não for shareAll
    if (!perms.shareAll && perms.specificIds) {
      accounts = accounts.filter(a => perms.specificIds.includes(a.id));
    }

    // 5. Aplicar nível de detalhe
    for (const account of accounts) {
      const sharedAccount: any = {
        id: account.id,
        name: account.name,
        currency: account.currency,
        ownerName: sharing.ownerDisplayName,
        ownerUserId: ownerUserId,
      };

      if (perms.showBalance) {
        sharedAccount.balance = account.balance;
      }

      // NÃO incluir transações se showTransactions == false

      sharedAccounts.push(sharedAccount);
    }
  }

  return sharedAccounts;
}
```

### 7.5 Modificação no `backend/src/index.ts`

```typescript
// Adicionar rotas de família
import families from './routes/families';
import familyData from './routes/familyData';

// ...

app.route('/api/families', families);
app.route('/api/family-data', familyData);
```

---

## 8. Alterações no Frontend (React + Vite)

### 8.1 Novos Arquivos

```
frontend/src/
├── services/
│   ├── familyService.ts           ← NOVO (CRUD família, convites, sharing)
│
├── components/
│   ├── FamilyInviteModal.tsx       ← NOVO (modal de convite com config de permissões)
│   ├── FamilyMemberCard.tsx        ← NOVO (card de um membro na lista)
│   ├── FamilySharingConfig.tsx     ← NOVO (configurador de permissões granulares)
│   ├── FamilyInvitationBanner.tsx  ← NOVO (banner de convite pendente)
│   ├── SharedAccountCard.tsx       ← NOVO (card de conta compartilhada)
│   ├── SharedCreditCardCard.tsx    ← NOVO (card de cartão compartilhado)
│
├── pages/
│   ├── Settings.tsx                ← MODIFICADO (adicionar seção Família)
│
├── context/
│   ├── FamilyContext.tsx           ← NOVO (estado global da família)
│
├── types/
│   ├── index.ts                   ← MODIFICADO (adicionar types de família)
│   ├── family.ts                  ← NOVO (types específicos de família)
```

### 8.2 Onde aparece na UI — Página de Settings

A seção de Família será inserida na página de **Configurações** (`Settings.tsx`), entre a seção "Conta" e "Preferências".

**Estrutura da seção:**

```
┌─────────────────────────────────────────────────────┐
│  👥 Família                                         │
│  Compartilhe dados financeiros com pessoas próximas  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Minha Família ─────────────────────────────┐    │
│  │  📌 Família Castellano                       │    │
│  │  Membros: 2   |   Criada em: 12/02/2026     │    │
│  │                                              │    │
│  │  👤 Gabriel (você) — Administrador           │    │
│  │  👤 Maria — Membro                           │    │
│  │     [Editar Permissões] [Remover]            │    │
│  │                                              │    │
│  │  [+ Convidar Membro]                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Convites Pendentes ────────────────────────┐    │
│  │  📩 João (joao@email.com) convidou você      │    │
│  │     [Aceitar]  [Recusar]                     │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Se não tem família ────────────────────────┐    │
│  │  Você ainda não faz parte de uma família.    │    │
│  │  [ Criar Família ]                           │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 8.3 Modal de Convite com Configuração de Permissões

```
┌──────────────────────────────────────────────┐
│  📩 Convidar para a Família                  │
├──────────────────────────────────────────────┤
│                                              │
│  Email: [_________________________________]  │
│                                              │
│  ── O que compartilhar? ──                   │
│                                              │
│  🏦 Contas Bancárias                         │
│  ├── ☑ Compartilhar saldo           ALL/IDs  │
│  └── ☐ Compartilhar transações               │
│                                              │
│  💳 Cartões de Crédito                       │
│  ├── ☑ Compartilhar limite disponível        │
│  ├── ☑ Compartilhar total da fatura          │
│  └── ☐ Compartilhar transações               │
│                                              │
│  📊 Orçamentos                               │
│  ├── ☑ Compartilhar % gasto                  │
│  └── ☐ Compartilhar valores detalhados       │
│                                              │
│  📈 Relatórios                               │
│  ├── ☑ Visão geral (receita/despesa)         │
│  └── ☐ Detalhamento por categoria            │
│                                              │
│  💡 Atalhos:                                 │
│  [Compartilhar Tudo] [Apenas Saldos]         │
│                                              │
│         [Cancelar]    [Enviar Convite]        │
└──────────────────────────────────────────────┘
```

### 8.4 "Family View" no Dashboard

No Dashboard, se o usuário faz parte de uma família, aparece uma **aba** ou **toggle** para alternar entre:
- **Meu Espaço** (visão atual)
- **Visão Família** (dados compartilhados por outros membros)

```
┌─ Dashboard ─────────────────────────────────────────┐
│                                                     │
│  [🔒 Meu Espaço]  [👥 Família]    ← Toggle/Tabs    │
│                                                     │
│  ── Quando "Família" está ativo ──                  │
│                                                     │
│  ┌─ Maria compartilhou com você ───────────────┐    │
│  │                                              │    │
│  │  🏦 Conta Nubank   →  R$ 3.240,00           │    │
│  │  🏦 Conta Itaú     →  R$ 12.800,00          │    │
│  │  💳 Cartão Nubank  →  Disponível: R$ 2.100  │    │
│  │  📊 Total despesas mês → R$ 4.500           │    │
│  │                                              │    │
│  │  (sem transações — não compartilhadas)       │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ João compartilhou com você ────────────────┐    │
│  │  🏦 Conta BB      →  R$ 8.900,00            │    │
│  │  💳 Cartão BB     →  Fatura: R$ 1.200       │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 9. Visão da "Family View" — Dashboard Compartilhado

### 9.1 Princípios de UX

1. **Separação clara:** A visão da família é sempre separada dos dados pessoais. Não mistura.
2. **Identidade visual:** Dados de cada membro têm uma "badge" colorida com iniciais ou foto.
3. **Somente leitura:** Dados compartilhados são SOMENTE LEITURA. Ninguém edita dados de outro.
4. **Modo leve:** Quando só saldos são compartilhados, usar cards compactos tipo "resumo".
5. **Nível de detalhe progressivo:** Se tem permissão completa, pode clicar para expandir.

### 9.2 Componente SharedAccountCard (Modo Resumo)

```
┌────────────────────────────────┐
│  🏦 Nubank                     │
│  Saldo: R$ 3.240,00           │
│  👤 Maria                      │
│  ──────────────────────        │
│  🔒 Transações não visíveis    │
└────────────────────────────────┘
```

### 9.3 Componente SharedCreditCardCard (Modo Resumo)

```
┌────────────────────────────────┐
│  💳 Cartão Nubank              │
│  Disponível: R$ 2.100 / 5.000 │
│  ████████████░░░░  42%         │  ← Progress bar do limite
│  👤 Maria                      │
└────────────────────────────────┘
```

---

## 10. Plano de Implementação em Fases

### Fase 1 — Fundação (1-2 sprints)
- [ ] Criar coleções no Firestore (`families`, `familyMembers`, `familyInvitations`, `familySharing`)
- [ ] Implementar tipos TypeScript (frontend + backend)
- [ ] Implementar rotas CRUD de família no backend
- [ ] Implementar seção "Família" na página de Settings (criar/editar família)
- [ ] Implementar testes básicos de segurança

### Fase 2 — Sistema de Convites (1 sprint)
- [ ] Implementar FamilyInviteModal com configuração de permissões
- [ ] Implementar endpoint de envio de convite
- [ ] Implementar detecção de convites pendentes (banner no login)
- [ ] Implementar aceite/recusa de convites
- [ ] Criar FamilyContext para estado global

### Fase 3 — Dados Compartilhados (2 sprints)
- [ ] Implementar endpoints de leitura de dados compartilhados no backend
- [ ] Implementar filtro por permissões granulares no backend
- [ ] Criar componentes SharedAccountCard, SharedCreditCardCard
- [ ] Implementar aba "Família" no Dashboard
- [ ] Implementar FamilyService no frontend

### Fase 4 — Polish e UX (1 sprint)
- [ ] Implementar edição de permissões pós-convite
- [ ] Implementar remoção de membros
- [ ] Implementar sair de uma família
- [ ] Implementar tema visual para dados compartilhados
- [ ] Traduções (PT, EN, ES) para todas as novas strings
- [ ] Testes end-to-end

### Fase 5 — Segurança e Produção (1 sprint)
- [ ] Atualizar Firestore Security Rules para produção
- [ ] Testar isolamento de dados entre famílias
- [ ] Testar que permissões granulares funcionam corretamente
- [ ] Deploy e monitoramento

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Vazamento de dados entre famílias** | Crítico | Toda validação no backend; security rules como 2ª camada |
| **Performance com múltiplas queries** | Médio | Caching no frontend (FamilyContext); queries batch no backend |
| **Complexidade de UI** | Médio | Começar com permissões simples (all or nothing); granular depois |
| **Convites spam** | Baixo | Limitar a 5 convites pendentes por família; expiração de 7 dias |
| **Conflito de dados** | Baixo | Dados compartilhados são somente-leitura |
| **Backend REST API sem autenticação serverside** | Alto | O backend usa REST API do Firestore (sem Admin SDK). Considerar migrar para Admin SDK via service account para operações de família. |

---

## 12. Decisões de Design Pendentes

1. **Nome da feature:** "Família" ou "Compartilhamento"? Família é mais amigável, mas compartilhamento é mais genérico.
2. **Limite de membros:** Máximo de membros por família? (Sugestão: 10)
3. **Múltiplas famílias:** Um usuário pode pertencer a mais de uma família? (Sugestão: sim, limite de 3)
4. **Notificação de convite:** Email automático ou apenas in-app?
5. **Histórico de alterações:** Log de quem alterou permissões e quando?
6. **E2E Encryption:** Os dados compartilhados devem ser criptografados? (Sugestão: fase futura)
7. **Admin SDK:** O backend atualmente usa REST API do Firestore. Para a feature de família, pode ser necessário usar o Firebase Admin SDK (via service account) para fazer queries cross-user. Isso requer avaliar se é compatível com Cloudflare Workers.

---

## Apêndice A: Índices Firestore Necessários

```json
{
  "indexes": [
    {
      "collectionGroup": "familyMembers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "familyId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "familyMembers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "familyInvitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "invitedEmail", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "familySharing",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "familyId", "order": "ASCENDING" },
        { "fieldPath": "targetUserId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Apêndice B: Novos Types TypeScript

```typescript
// frontend/src/types/family.ts

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
  updatedAt: string;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  invitedBy: string;
  invitedByName?: string;
  invitedEmail: string;
  familyName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  permissions: SharingPermissions;
  createdAt: string;
  expiresAt: string;
}

export interface FamilySharing {
  id: string;
  familyId: string;
  ownerUserId: string;
  ownerDisplayName?: string;
  targetUserId: string;
  permissions: SharingPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface SharingPermissions {
  accounts: {
    shareAll: boolean;
    specificIds?: string[];
    showBalance: boolean;
    showTransactions: boolean;
  };
  creditCards: {
    shareAll: boolean;
    specificIds?: string[];
    showLimit: boolean;
    showAvailable: boolean;
    showBillTotal: boolean;
    showTransactions: boolean;
  };
  categories: {
    shareAll: boolean;
    specificIds?: string[];
  };
  budgets: {
    shareAll: boolean;
    specificIds?: string[];
    showSpent: boolean;
    showRemaining: boolean;
  };
  reports: {
    shareOverview: boolean;
    shareCategoryBreakdown: boolean;
    shareTrends: boolean;
  };
}

// Dados compartilhados que chegam do backend (somente leitura)
export interface SharedAccount {
  id: string;
  name: string;
  currency: string;
  balance?: number;        // Só se showBalance == true
  ownerName: string;
  ownerUserId: string;
}

export interface SharedCreditCard {
  id: string;
  name: string;
  creditLimit?: number;     // Só se showLimit == true
  available?: number;       // Só se showAvailable == true
  billTotal?: number;       // Só se showBillTotal == true
  color?: string;
  ownerName: string;
  ownerUserId: string;
}

export interface SharedBudget {
  id: string;
  categoryName: string;
  amount: number;
  spent?: number;          // Só se showSpent == true
  remaining?: number;      // Só se showRemaining == true
  percentage?: number;
  ownerName: string;
  ownerUserId: string;
}

export interface FamilySummary {
  familyId: string;
  familyName: string;
  members: FamilyMember[];
  sharedData: {
    ownerUserId: string;
    ownerDisplayName: string;
    accounts?: SharedAccount[];
    creditCards?: SharedCreditCard[];
    budgets?: SharedBudget[];
    overview?: {
      totalIncome?: number;
      totalExpenses?: number;
    };
  }[];
}
```
