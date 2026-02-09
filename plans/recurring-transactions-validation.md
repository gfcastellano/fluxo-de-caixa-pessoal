# Validação das Correções de Transações Recorrentes

## Resumo das Correções Implementadas

### Backend (`backend/src/routes/transactions.ts`)
1. ✅ Transação pai agora recebe `installmentNumber: 1` e `totalInstallments` correto
2. ✅ Função `generateRecurringInstancesWithCount` calcula `totalInSeries = count + 1`
3. ✅ Instâncias filhas recebem `installmentNumber` sequencial (2, 3, 4...) e `totalInstallments` correto
4. ✅ Função `generateRecurringInstances` (por data) também calcula e define os campos corretamente

### Frontend (`frontend/src/components/TransactionModal.tsx`)
1. ✅ Adicionado campo para definir número de parcelas (`recurringCount`)
2. ✅ Toggle entre modo "Por Número de Parcelas" e "Por Data de Término"
3. ✅ Cálculo automático da data final ao informar número de parcelas
4. ✅ Cálculo automático do número de parcelas ao informar data final
5. ✅ Traduções adicionadas (PT, EN, ES)

---

## Casos de Teste

### Teste 1: Criar transação recorrente por número de parcelas

**Passos:**
1. Acesse a página de Transações
2. Clique em "Nova Transação"
3. Preencha: Descrição, Valor, Tipo, Categoria, Data (ex: 09/02/2026)
4. Marque "Transação Recorrente"
5. Selecione "Por Número de Parcelas"
6. Informe "2" no campo "Número de Parcelas"
7. Selecione frequência "Mensal"
8. Salve

**Resultado Esperado:**
- Serão criadas 2 transações no total
- Transação de Fev/2026: mostra "1 de 2"
- Transação de Mar/2026: mostra "2 de 2"

**Verificação no Firestore:**
```javascript
// Query para verificar as transações criadas
db.collection('transactions')
  .where('description', '==', 'SUA_DESCRICAO')
  .orderBy('date')
  .get()
```

Cada documento deve ter:
- `installmentNumber`: 1 (para Fev), 2 (para Mar)
- `totalInstallments`: 2
- `isRecurring`: true (apenas a primeira)
- `isRecurringInstance`: true (apenas as filhas)
- `parentTransactionId`: null (pai) ou ID do pai (filhas)

---

### Teste 2: Criar transação recorrente por data final

**Passos:**
1. Acesse a página de Transações
2. Clique em "Nova Transação"
3. Preencha: Descrição, Valor, Tipo, Categoria, Data (ex: 09/02/2026)
4. Marque "Transação Recorrente"
5. Selecione "Por Data de Término"
6. Informe data final: 09/04/2026
7. Selecione frequência "Mensal"
8. Salve

**Resultado Esperado:**
- Serão criadas 3 transações no total (Fev, Mar, Abr)
- Sistema deve mostrar preview: "3 parcelas calculadas"
- Transação de Fev/2026: mostra "1 de 3"
- Transação de Mar/2026: mostra "2 de 3"
- Transação de Abr/2026: mostra "3 de 3"

---

### Teste 3: Filtro "Todas" vs Filtro Mensal

**Pré-requisito:** Ter criado uma transação recorrente com 3 parcelas (Fev, Mar, Abr)

**Teste 3a: Filtro "Todas"**
1. Na página de Transações, selecione filtro "Todas"

**Resultado Esperado:**
- Lista mostra 3 transações
- Cada uma mostra seu número de parcela: "1 de 3", "2 de 3", "3 de 3"

**Teste 3b: Filtro Mensal - Mês Atual (Fev/2026)**
1. Na página de Transações, selecione filtro "Mês"
2. Navegue para Fevereiro/2026

**Resultado Esperado:**
- Lista mostra apenas 1 transação (a de Fev)
- Mostra "1 de 3" (número absoluto na série)

**Teste 3c: Filtro Mensal - Próximo Mês (Mar/2026)**
1. Clique na seta para avançar para Março/2026

**Resultado Esperado:**
- Lista mostra apenas 1 transação (a de Mar)
- Mostra "2 de 3" (número absoluto na série)

**Teste 3d: Filtro Mensal - Mês Seguinte (Abr/2026)**
1. Clique na seta para avançar para Abril/2026

**Resultado Esperado:**
- Lista mostra apenas 1 transação (a de Abr)
- Mostra "3 de 3" (número absoluto na série)

---

### Teste 4: Frequência Semanal

**Passos:**
1. Crie transação recorrente em 09/02/2026 (segunda-feira)
2. Selecione frequência "Semanal"
3. Informe 4 parcelas

**Resultado Esperado:**
- 4 transações criadas: 09/02, 16/02, 23/02, 02/03
- Cada uma mostra "X de 4"

---

### Teste 5: Frequência Anual

**Passos:**
1. Crie transação recorrente em 09/02/2026
2. Selecione frequência "Anual"
3. Informe data final: 09/02/2028

**Resultado Esperado:**
- 3 transações criadas: 09/02/2026, 09/02/2027, 09/02/2028
- Cada uma mostra "X de 3"

---

### Teste 6: Atualizar transação recorrente

**Passos:**
1. Edite uma transação recorrente existente
2. Altere o valor
3. Salve

**Resultado Esperado:**
- Apenas a transação selecionada é atualizada
- Outras parcelas mantêm valores originais
- (Comportamento esperado - não há propagação automática)

---

### Teste 7: Deletar transação recorrente

**Passos:**
1. Na lista de transações, encontre uma transação recorrente pai (com ícone de repetição)
2. Clique no ícone de lixeira
3. Confirme a exclusão

**Resultado Esperado:**
- Transação pai e todas as instâncias filhas são removidas
- Mensagem de confirmação pergunta se deseja excluir todas as ocorrências

---

### Teste 8: Deletar instância individual

**Passos:**
1. Na lista de transações, expanda uma transação recorrente pai
2. Clique na lixeira de uma instância filha específica

**Resultado Esperado:**
- Apenas aquela instância é removida
- Outras instâncias e a transação pai permanecem
- Numerção permanece inalterada (não renumera)

---

## Verificação via Console do Navegador

Para debug, abra o console do navegador (F12) e verifique:

```javascript
// Verificar transações carregadas
const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
console.table(transactions.map(t => ({
  description: t.description,
  date: t.date,
  installment: `${t.installmentNumber} de ${t.totalInstallments}`,
  isRecurring: t.isRecurring,
  isRecurringInstance: t.isRecurringInstance,
  parentId: t.parentTransactionId
})));
```

## Possíveis Problemas e Soluções

### Problema: Transações não aparecem com "X de Y"
**Causa provável:** Campos `installmentNumber` ou `totalInstallments` não foram salvos
**Solução:** Verifique no Firestore se os campos existem. Se não existirem, recrie a transação.

### Problema: Cálculo automático não funciona
**Causa provável:** Data inicial ou frequência não definidas
**Solução:** Certifique-se de que a data da transação e a frequência estão preenchidas antes de usar o cálculo automático.

### Problema: Total de parcelas incorreto
**Causa provável:** Lógica de cálculo no backend falhou
**Solução:** Verifique os logs do backend (Cloudflare Workers) para erros.

---

## Checklist de Validação

- [ ] Teste 1 passou: Criação por número de parcelas
- [ ] Teste 2 passou: Criação por data final
- [ ] Teste 3 passou: Filtros "Todas" e mensais funcionam corretamente
- [ ] Teste 4 passou: Frequência semanal funciona
- [ ] Teste 5 passou: Frequência anual funciona
- [ ] Teste 6 passou: Atualização funciona
- [ ] Teste 7 passou: Deleção em lote funciona
- [ ] Teste 8 passou: Deleção individual funciona
- [ ] Todos os campos `installmentNumber` e `totalInstallments` estão corretos no Firestore
- [ ] Exibição "X de Y" aparece corretamente em todos os filtros

---

## Notas Finais

As correções garantem que:
1. O número total de transações é calculado corretamente no momento da criação
2. Cada transação sabe sua posição na série (`installmentNumber`)
3. Cada transação sabe o total da série (`totalInstallments`)
4. A exibição "X de Y" é consistente em todos os filtros
5. O usuário tem controle sobre quantas transações serão criadas

Se encontrar qualquer comportamento inesperado, verifique:
1. Console do navegador por erros de JavaScript
2. Logs do backend (Cloudflare Workers)
3. Dados no Firestore para confirmar estrutura correta
