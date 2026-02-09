# Refatoração: Linha Agrupadora para Transações Recorrentes

## Problema Atual

Atualmente, a primeira linha mostra a transação pai (parcela 1 de 3) como uma entrada normal, e ao expandir, mostra as instâncias filhas (2 de 3, 3 de 3).

## Solução Desejada

A primeira linha deve ser um **agrupador/resumo** que representa toda a série recorrente no período filtrado, não a primeira transação em si.

### Layout Desejado

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔄 Feira  [3 ocorrências]  monthly  2x  │ Alimentação │ -R$ 1.500,00 │ ✏️ 🗑️ │ ▼
├─────────────────────────────────────────────────────────────────────┤
│   📄 08/02/2026  Feira  1 de 3  │ Alimentação │ -R$ 500,00 │ ✏️ 🗑️ │
│   📄 08/03/2026  Feira  2 de 3  │ Alimentação │ -R$ 500,00 │ ✏️ 🗑️ │
│   📄 08/04/2026  Feira  3 de 3  │ Alimentação │ -R$ 500,00 │ ✏️ 🗑️ │
└─────────────────────────────────────────────────────────────────────┘
```

### Características da Linha Agrupadora

1. **Ícone de recorrência** (🔄) ao invés de data
2. **Nome da transação** + **indicador de ocorrências** (ex: "3 ocorrências")
3. **Badge de frequência** (monthly, weekly, yearly)
4. **Badge de multiplicador** (2x, 3x, etc.) - quantas vezes aparece no período
5. **Valor total** somado de todas as ocorrências no período
6. **Botão de editar** que abre modal com modo "Esta e seguintes" pré-selecionado
7. **Botão de deletar** que deleta toda a série
8. **Seta para expandir/colapsar** (▼/▲)

### Características das Linhas Expandidas

1. **Todas as instâncias** (incluindo a que era "pai") aparecem dentro do dropdown
2. Cada linha mostra: data, nome, "X de Y", categoria, conta, valor
3. Cada linha tem botões individuais de editar e deletar
4. Ao editar uma instância individual, modo "Somente esta" é pré-selecionado

## Mudanças Necessárias

### 1. Lógica de Agrupamento (`Transactions.tsx`)

Atualmente:
```typescript
const { parentMap, standalone, recurringParents } = useMemo(() => {
  // Separa pais e filhas
  // Pais ficam em recurringParents
  // Filhas ficam em parentMap
}, [transactions]);
```

Novo:
```typescript
const { recurringGroups, standalone } = useMemo(() => {
  // Agrupar TODAS as transações de uma série (pai + filhas)
  // Calcular estatísticas do grupo (total de ocorrências, valor somado)
  // Retornar grupos ao invés de pais separados
}, [transactions]);
```

### 2. Estrutura do Grupo

```typescript
interface RecurringGroup {
  // Identificação
  parentId: string;
  description: string;
  
  // Metadados da série
  recurrencePattern: 'monthly' | 'weekly' | 'yearly';
  totalInstallments: number;
  
  // Estatísticas do período filtrado
  occurrencesInPeriod: number;  // Quantas aparecem no período atual
  totalAmountInPeriod: number;  // Soma dos valores no período
  
  // Transações (pai + filhas no período)
  transactions: Transaction[];  // Ordenadas por installmentNumber
  
  // Dados para exibição
  type: 'income' | 'expense';
  categoryId: string;
  category?: Category;
  accountId?: string;
  account?: Account;
}
```

### 3. Renderização da Linha Agrupadora

```typescript
{recurringGroups.map((group) => {
  const isExpanded = expandedRecurring.has(group.parentId);
  
  return (
    <>
      {/* Linha Agrupadora */}
      <tr 
        key={`group-${group.parentId}`}
        className="bg-blue/5 hover:bg-blue/10 cursor-pointer"
        onClick={() => toggleRecurringExpand(group.parentId)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-blue" />
            <span className="font-medium text-ink">
              {group.description}
            </span>
            <span className="text-xs text-slate">
              ({group.occurrencesInPeriod} ocorrências)
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-xs bg-blue/10 text-blue">
              {group.recurrencePattern}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate/10 text-slate">
              {group.occurrencesInPeriod}x
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className="px-2 py-1 rounded-full text-xs bg-slate/5">
            {group.category?.name}
          </span>
        </td>
        <td className="py-3 px-4">
          {group.account?.name}
        </td>
        <td className={`py-3 px-4 text-right font-bold ${group.type === 'income' ? 'text-emerald' : 'text-rose'}`}>
          {group.type === 'income' ? '+' : '-'}
          {formatCurrency(group.totalAmountInPeriod)}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex justify-end gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditModal(group.transactions[0], 'forward');
              }}
              className="p-2 text-slate hover:bg-slate/10 rounded-full"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(group.parentId, true);
              }}
              className="p-2 text-rose hover:bg-rose/10 rounded-full"
            >
              <Trash2 size={16} />
            </button>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </td>
      </tr>
      
      {/* Linhas Expandidas - TODAS as transações */}
      {isExpanded && group.transactions.map((transaction) => (
        <tr key={transaction.id} className="bg-blue/5 border-b border-white/20">
          <td className="py-2 px-4 pl-10">
            <div className="flex items-center gap-2">
              <Copy size={12} className="text-blue" />
              {formatDate(transaction.date)}
            </div>
          </td>
          <td className="py-2 px-4">
            <div className="flex items-center gap-2">
              {transaction.description}
              <span className="text-blue text-xs">
                {transaction.installmentNumber} de {transaction.totalInstallments}
              </span>
            </div>
          </td>
          <td className="py-2 px-4">
            {transaction.category?.name}
          </td>
          <td className="py-2 px-4">
            {transaction.account?.name}
          </td>
          <td className={`py-2 px-4 text-right ${transaction.type === 'income' ? 'text-emerald' : 'text-rose'}`}>
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </td>
          <td className="py-2 px-4 text-right">
            <div className="flex justify-end gap-1">
              <button 
                onClick={() => handleOpenEditModal(transaction)}
                className="p-1.5 text-slate hover:bg-slate/10 rounded-full"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(transaction.id)}
                className="p-1.5 text-rose hover:bg-rose/10 rounded-full"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
})}
```

### 4. Função de Agrupamento

```typescript
const { recurringGroups, standalone } = useMemo(() => {
  const groups = new Map<string, RecurringGroup>();
  const standalone: Transaction[] = [];

  transactions.forEach(t => {
    // Se é transação recorrente (pai ou filha)
    if (t.isRecurring || t.parentTransactionId || t.isRecurringInstance) {
      const parentId = t.isRecurring ? t.id : t.parentTransactionId!;
      
      if (!groups.has(parentId)) {
        groups.set(parentId, {
          parentId,
          description: t.description,
          recurrencePattern: t.recurrencePattern || 'monthly',
          totalInstallments: t.totalInstallments || 1,
          occurrencesInPeriod: 0,
          totalAmountInPeriod: 0,
          transactions: [],
          type: t.type,
          categoryId: t.categoryId,
          category: t.category,
          accountId: t.accountId,
          account: t.account,
        });
      }
      
      const group = groups.get(parentId)!;
      group.transactions.push(t);
      group.occurrencesInPeriod++;
      group.totalAmountInPeriod += t.amount;
    } else {
      // Transação normal (não recorrente)
      standalone.push(t);
    }
  });

  // Ordenar transações dentro de cada grupo por installmentNumber
  groups.forEach(group => {
    group.transactions.sort((a, b) => 
      (a.installmentNumber || 0) - (b.installmentNumber || 0)
    );
  });

  return {
    recurringGroups: Array.from(groups.values()),
    standalone,
  };
}, [transactions]);
```

### 5. Mobile (Cards)

Para mobile, aplicar a mesma lógica:
- Card agrupador com resumo
- Ao tocar, expande mostrando todos os cards individuais

## Benefícios

1. **Clareza visual**: Fica claro que é um grupo de transações recorrentes
2. **Informação agregada**: Mostra total do período de uma vez
3. **Acesso fácil**: Um clique para ver todas as ocorrências
4. **Edição intuitiva**: 
   - Editar no agrupador = editar em massa (forward/all)
   - Editar na instância = editar individual (single)
5. **Consistência**: Todas as instâncias (incluindo "pai") são tratadas igualmente

## Exemplo Visual

**Antes (confuso):**
```
08/02/2026  Feira  1 de 3  monthly  2x  │ -R$ 500,00  │ ✏️ 🗑️ │ ▼
  08/03/2026  Feira  2 de 3  (Auto)     │ -R$ 500,00  │ ✏️ 🗑️ │
  08/04/2026  Feira  3 de 3  (Auto)     │ -R$ 500,00  │ ✏️ 🗑️ │
```

**Depois (claro):**
```
🔄 Feira  (3 ocorrências)  monthly  3x  │ -R$ 1.500,00  │ ✏️ 🗑️ │ ▼
  📄 08/02/2026  Feira  1 de 3         │ -R$ 500,00    │ ✏️ 🗑️ │
  📄 08/03/2026  Feira  2 de 3         │ -R$ 500,00    │ ✏️ 🗑️ │
  📄 08/04/2026  Feira  3 de 3         │ -R$ 500,00    │ ✏️ 🗑️ │
```
