/**
 * Script para deletar todas as transações de um usuário específico
 * Uso: node scripts/delete_user_transactions.js <userId>
 */

const https = require('https');
const projectId = 'fluxo-de-caixa-pessoal-d6d3f';
const baseUrl = `firestore.googleapis.com`;

// Firebase Web API Key (pública, pode ser encontrada no firebase config)
const apiKey = process.env.FIREBASE_API_KEY || '';

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Erro: User ID é obrigatório');
  console.log('Uso: node scripts/delete_user_transactions.js <userId>');
  process.exit(1);
}

console.log(`🔍 Buscando transações para o usuário: ${userId}`);

// Função para fazer requisições HTTP
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const queryString = apiKey ? `?key=${apiKey}` : '';
    const options = {
      hostname: baseUrl,
      path: `/v1/projects/${projectId}/databases/(default)/documents/${path}${queryString}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Função para converter documento Firestore
function convertFromFirestore(doc) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};
  const result = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue, 10);
    } else if (value.doubleValue !== undefined) {
      result[key] = value.doubleValue;
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue;
    } else if (value.timestampValue !== undefined) {
      result[key] = new Date(value.timestampValue);
    } else if (value.referenceValue !== undefined) {
      result[key] = value.referenceValue;
    } else if (value.mapValue !== undefined) {
      result[key] = convertFromFirestore({ fields: value.mapValue.fields || {} });
    } else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map(v => convertFromFirestore({ fields: { v } }).v);
    }
  }

  return result;
}

// Função principal
async function deleteUserTransactions() {
  try {
    // Buscar todas as transações
    const response = await makeRequest('transactions');
    const documents = response.documents || [];

    // Filtrar por userId
    const userTransactions = documents
      .filter(doc => {
        const fields = doc.fields || {};
        const docUserId = fields.userId?.stringValue;
        return docUserId === userId;
      });

    console.log(`📊 Encontradas ${userTransactions.length} transações para o usuário ${userId}`);

    if (userTransactions.length === 0) {
      console.log('✅ Nenhuma transação para deletar.');
      return;
    }

    // Deletar cada transação
    let deletedCount = 0;
    let errors = [];

    for (const doc of userTransactions) {
      const docId = doc.name.split('/').pop();
      const docName = doc.name;
      const relativePath = docName.replace(`projects/${projectId}/databases/(default)/documents/`, '');

      try {
        // Deletar documento
        await makeRequest(relativePath, 'DELETE');
        console.log(`  ✅ Deletada transação: ${docId}`);
        deletedCount++;
      } catch (error) {
        console.error(`  ❌ Erro ao deletar ${docId}:`, error.message);
        errors.push({ id: docId, error: error.message });
      }
    }

    console.log('\n📋 Resumo:');
    console.log(`  Total de transações encontradas: ${userTransactions.length}`);
    console.log(`  Transações deletadas: ${deletedCount}`);
    console.log(`  Erros: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Erros detalhados:');
      errors.forEach(e => console.log(`    - ${e.id}: ${e.error}`));
      process.exit(1);
    }

    console.log('\n✅ Operação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

deleteUserTransactions();
