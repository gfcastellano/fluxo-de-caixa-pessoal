# Funcionalidade: Edição em Massa de Transações Recorrentes

## Resumo

Adicionar opções de edição em massa quando o usuário edita uma transação que faz parte de uma série recorrente (pai ou filha).

## Modos de Edição

1. **Somente esta** (padrão)
   - Edita apenas a transação selecionada
   - Não afeta outras transações da série

2. **Esta e seguintes** (recomendado)
   - Edita a transação selecionada e TODAS as subsequentes na série
   - Ex: Selecionou parcela 2 de 5 → edita parcelas 2, 3, 4, 5

3. **Todas da série** (não recomendado)
   - Edita TODAS as transações da série (para trás e para frente)
   - Ex: Selecionou parcela 2 de 5 → edita parcelas 1, 2, 3, 4, 5

## Fluxo de Implementação

### Frontend

#### 1. TransactionModal.tsx

Quando `isEditing` é true e a transação é parte de série recorrente (`isRecurring` ou `parentTransactionId`), mostrar selector de modo:

```typescript
// Estados adicionais
const [editMode, setEditMode] = useState<'single' | 'forward' | 'all'>('single');

// Verificar se é transação recorrente
const isRecurringTransaction = transaction && (
  transaction.isRecurring || 
  transaction.parentTransactionId ||
  transaction.isRecurringInstance
);
```

UI no modal (quando editando transação recorrente):
```
┌─────────────────────────────────────┐
│ Modo de Edição                      │
│ ○ Somente esta                      │
│ ● Esta e seguintes (recomendado)    │
│ ○ Todas da série                    │
└─────────────────────────────────────┘
```

#### 2. Envio dos dados

No `handleSubmit`, quando editando:
```typescript
if (isEditing) {
  transactionData.editMode = editMode; // 'single' | 'forward' | 'all'
  // Se for instância filha, precisamos do parentTransactionId
  if (transaction.parentTransactionId) {
    transactionData.parentTransactionId = transaction.parentTransactionId;
  }
}
```

### Backend

#### 1. PATCH /:id - Modificar para suportar edição em massa

```typescript
app.patch('/:id', async (c) => {
  try {
    const transactionId = c.req.param('id');
    const body = await c.req.json();
    const { editMode = 'single', ...updates } = body;

    const firebase = new FirebaseService(c.env);
    
    // Buscar transação atual
    const transaction = await firebase.getDocument('transactions', transactionId);
    
    if (!transaction) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    // Verificar se é parte de série recorrente
    const isRecurringSeries = transaction.isRecurring || 
                              transaction.parentTransactionId ||
                              transaction.isRecurringInstance;

    if (!isRecurringSeries || editMode === 'single') {
      // Edição simples - apenas esta transação
      await firebase.updateDocument('transactions', transactionId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Edição em massa
      await updateRecurringSeries(firebase, transaction, updates, editMode);
    }

    return c.json({ success: true });
  } catch (error) {
    // ... error handling
  }
});
```

#### 2. Nova função: updateRecurringSeries

```typescript
async function updateRecurringSeries(
  firebase: FirebaseService,
  transaction: Transaction,
  updates: Partial<Transaction>,
  editMode: 'forward' | 'all'
): Promise<void> {
  // Determinar o ID da transação pai
  const parentId = transaction.isRecurring 
    ? transaction.id 
    : transaction.parentTransactionId;

  // Buscar todas as transações da série
  const seriesTransactions = await firebase.queryDocuments('transactions', [
    { 
      field: 'parentTransactionId', 
      op: '==', 
      value: parentId 
    }
  ]);

  // Adicionar a transação pai se existir
  if (transaction.isRecurring) {
    seriesTransactions.unshift(transaction);
  } else {
    const parent = await firebase.getDocument('transactions', parentId);
    if (parent) {
      seriesTransactions.unshift(parent);
    }
  }

  // Ordenar por installmentNumber ou por data
  seriesTransactions.sort((a, b) => 
    (a.installmentNumber || 0) - (b.installmentNumber || 0)
  );

  // Determinar quais transações atualizar
  let transactionsToUpdate: Transaction[] = [];

  if (editMode === 'forward') {
    // Esta e seguintes
    const startIndex = seriesTransactions.findIndex(t => t.id === transaction.id);
    transactionsToUpdate = seriesTransactions.slice(startIndex);
  } else if (editMode === 'all') {
    // Todas da série
    transactionsToUpdate = seriesTransactions;
  }

  // Campos que podem ser atualizados em massa
  const allowedFields = [
    'description',
    'amount', 
    'type',
    'categoryId',
    'accountId'
  ];

  // Filtrar apenas campos permitidos
  const filteredUpdates: Partial<Transaction> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  // Atualizar todas as transações selecionadas
  const updatePromises = transactionsToUpdate.map(t => 
    firebase.updateDocument('transactions', t.id, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    })
  );

  await Promise.all(updatePromises);
}
```

### Campos Atualizáveis em Massa

- ✅ `description` - Descrição
- ✅ `amount` - Valor
- ✅ `type` - Tipo (income/expense)
- ✅ `categoryId` - Categoria
- ✅ `accountId` - Conta

- ❌ `date` - Data (não faz sentido atualizar em massa)
- ❌ `installmentNumber` - Número da parcela (imutável)
- ❌ `totalInstallments` - Total de parcelas (imutável)
- ❌ `isRecurring` - Flag de recorrência (imutável)
- ❌ `recurrencePattern` - Padrão de recorrência (imutável)

### Traduções Necessárias

**Português:**
- `editMode.single`: "Somente esta"
- `editMode.forward`: "Esta e seguintes"
- `editMode.all`: "Todas da série"
- `editMode.recommended`: "(recomendado)"
- `editMode.notRecommended`: "(não recomendado)"
- `editMode.label`: "Modo de Edição"

**Inglês:**
- `editMode.single`: "Only this one"
- `editMode.forward`: "This and following"
- `editMode.all`: "All in series"
- `editMode.recommended`: "(recommended)"
- `editMode.notRecommended`: "(not recommended)"
- `editMode.label`: "Edit Mode"

**Espanhol:**
- `editMode.single`: "Solo esta"
- `editMode.forward`: "Esta y siguientes"
- `editMode.all`: "Todas en serie"
- `editMode.recommended`: "(recomendado)"
- `editMode.notRecommended`: "(no recomendado)"
- `editMode.label`: "Modo de Edición"

## Considerações de UX

1. **Selector visível apenas em edição** de transações recorrentes
2. **"Esta e seguintes" pré-selecionado** como padrão (mais comum)
3. **Visual warning** para "Todas da série" (pode afetar transações passadas)
4. **Confirmação** mostrando quantas transações serão afetadas
5. **Preview** das transações que serão atualizadas

## Exemplo de UI

```
┌─────────────────────────────────────────────┐
│ Editar Transação                            │
├─────────────────────────────────────────────┤
│                                             │
│ [Descrição: ] [Valor: ]                     │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Modo de Edição                        │   │
│ │                                       │   │
│ │ ○ Somente esta                        │   │
│ │                                       │   │
│ │ ● Esta e seguintes (recomendado)      │   │
│ │   └─ Serão atualizadas 3 transações   │   │
│ │      (parcelas 2, 3 e 4 de 5)         │   │
│ │                                       │   │
│ │ ○ Todas da série (não recomendado)    │   │
│ │   └─ Serão atualizadas 5 transações   │   │
│ │      (parcelas 1, 2, 3, 4 e 5)        │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [Cancelar]              [Salvar]            │
└─────────────────────────────────────────────┘
```
