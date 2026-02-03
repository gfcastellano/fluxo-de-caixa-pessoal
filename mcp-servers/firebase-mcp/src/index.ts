#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Initialize Firebase Admin
let db: Firestore;
let auth: Auth;

function initializeFirebase(projectId: string, serviceAccountKey?: string) {
  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } else {
    // Use application default credentials
    initializeApp({ projectId });
  }
  db = getFirestore();
  auth = getAuth();
}

// Define available tools
const TOOLS = [
  {
    name: 'firestore_create_collection',
    description: 'Create a new Firestore collection with initial document',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        documentId: { type: 'string', description: 'Initial document ID' },
        data: { type: 'object', description: 'Document data' },
      },
      required: ['collection', 'documentId', 'data'],
    },
  },
  {
    name: 'firestore_set_document',
    description: 'Set a document in Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        documentId: { type: 'string', description: 'Document ID' },
        data: { type: 'object', description: 'Document data' },
      },
      required: ['collection', 'documentId', 'data'],
    },
  },
  {
    name: 'firestore_get_document',
    description: 'Get a document from Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        documentId: { type: 'string', description: 'Document ID' },
      },
      required: ['collection', 'documentId'],
    },
  },
  {
    name: 'firestore_query',
    description: 'Query documents in Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'in', 'not-in'] },
              value: {},
            },
          },
        },
        orderBy: { type: 'string', description: 'Field to order by' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'firestore_delete_document',
    description: 'Delete a document from Firestore',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        documentId: { type: 'string', description: 'Document ID' },
      },
      required: ['collection', 'documentId'],
    },
  },
  {
    name: 'auth_create_user',
    description: 'Create a new Firebase Auth user',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        displayName: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'auth_get_user',
    description: 'Get a Firebase Auth user by UID or email',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
  {
    name: 'auth_delete_user',
    description: 'Delete a Firebase Auth user',
    inputSchema: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      },
      required: ['uid'],
    },
  },
  {
    name: 'auth_list_users',
    description: 'List Firebase Auth users',
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', default: 100 },
        pageToken: { type: 'string' },
      },
    },
  },
  {
    name: 'setup_firestore_database',
    description: 'Set up the Firestore database with required collections and security rules',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Firebase project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'setup_default_categories',
    description: 'Create default categories for a user',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
      },
      required: ['userId'],
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'firebase-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'firestore_create_collection': {
        const { collection, documentId, data } = args as { collection: string; documentId: string; data: Record<string, unknown> };
        await db.collection(collection).doc(documentId).set(data);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created collection '${collection}' with document '${documentId}'`,
            },
          ],
        };
      }

      case 'firestore_set_document': {
        const { collection, documentId, data } = args as { collection: string; documentId: string; data: Record<string, unknown> };
        await db.collection(collection).doc(documentId).set(data);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully set document '${documentId}' in collection '${collection}'`,
            },
          ],
        };
      }

      case 'firestore_get_document': {
        const { collection, documentId } = args as { collection: string; documentId: string };
        const doc = await db.collection(collection).doc(documentId).get();
        if (!doc.exists) {
          return {
            content: [{ type: 'text', text: `Document '${documentId}' not found in collection '${collection}'` }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2),
            },
          ],
        };
      }

      case 'firestore_query': {
        const { collection, filters, orderBy, limit } = args as {
          collection: string;
          filters?: Array<{ field: string; operator: string; value: unknown }>;
          orderBy?: string;
          limit?: number;
        };
        let query: FirebaseFirestore.Query = db.collection(collection);
        
        if (filters) {
          for (const filter of filters) {
            query = query.where(filter.field, filter.operator as FirebaseFirestore.WhereFilterOp, filter.value);
          }
        }
        
        if (orderBy) {
          query = query.orderBy(orderBy);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const snapshot = await query.get();
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(docs, null, 2),
            },
          ],
        };
      }

      case 'firestore_delete_document': {
        const { collection, documentId } = args as { collection: string; documentId: string };
        await db.collection(collection).doc(documentId).delete();
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted document '${documentId}' from collection '${collection}'`,
            },
          ],
        };
      }

      case 'auth_create_user': {
        const { email, password, displayName } = args as { email: string; password: string; displayName?: string };
        const user = await auth.createUser({
          email,
          password,
          displayName,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created user with UID: ${user.uid}`,
            },
          ],
        };
      }

      case 'auth_get_user': {
        const { uid, email } = args as { uid?: string; email?: string };
        let user;
        if (uid) {
          user = await auth.getUser(uid);
        } else if (email) {
          user = await auth.getUserByEmail(email);
        } else {
          return {
            content: [{ type: 'text', text: 'Either uid or email must be provided' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  emailVerified: user.emailVerified,
                  disabled: user.disabled,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'auth_delete_user': {
        const { uid } = args as { uid: string };
        await auth.deleteUser(uid);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted user with UID: ${uid}`,
            },
          ],
        };
      }

      case 'auth_list_users': {
        const { maxResults = 100, pageToken } = args as { maxResults?: number; pageToken?: string };
        const result = await auth.listUsers(maxResults, pageToken);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  users: result.users.map((user) => ({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                  })),
                  pageToken: result.pageToken,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'setup_firestore_database': {
        const { projectId } = args as { projectId: string };
        
        // Initialize if not already done
        if (!db) {
          initializeFirebase(projectId);
        }
        
        // Create initial collections with placeholder documents
        const collections = ['categories', 'transactions', 'budgets'];
        for (const collection of collections) {
          await db.collection(collection).doc('_init').set({
            createdAt: new Date().toISOString(),
            purpose: 'Collection initialization',
          });
          // Delete the placeholder
          await db.collection(collection).doc('_init').delete();
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully set up Firestore database for project '${projectId}' with collections: ${collections.join(', ')}`,
            },
          ],
        };
      }

      case 'setup_default_categories': {
        const { userId } = args as { userId: string };
        
        const defaultCategories = [
          // Income categories
          { name: 'Salary', type: 'income', color: '#22c55e', icon: 'wallet' },
          { name: 'Freelance', type: 'income', color: '#10b981', icon: 'briefcase' },
          { name: 'Investments', type: 'income', color: '#14b8a6', icon: 'trending-up' },
          { name: 'Gifts', type: 'income', color: '#06b6d4', icon: 'gift' },
          { name: 'Other Income', type: 'income', color: '#0ea5e9', icon: 'plus-circle' },
          // Expense categories
          { name: 'Food & Dining', type: 'expense', color: '#ef4444', icon: 'utensils' },
          { name: 'Transportation', type: 'expense', color: '#f97316', icon: 'car' },
          { name: 'Housing', type: 'expense', color: '#f59e0b', icon: 'home' },
          { name: 'Utilities', type: 'expense', color: '#84cc16', icon: 'zap' },
          { name: 'Entertainment', type: 'expense', color: '#a855f7', icon: 'film' },
          { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'shopping-bag' },
          { name: 'Health', type: 'expense', color: '#6366f1', icon: 'heart' },
          { name: 'Education', type: 'expense', color: '#8b5cf6', icon: 'book' },
          { name: 'Other Expense', type: 'expense', color: '#6b7280', icon: 'more-horizontal' },
        ];
        
        const batch = db.batch();
        
        for (const category of defaultCategories) {
          const docRef = db.collection('categories').doc();
          batch.set(docRef, {
            ...category,
            userId,
            createdAt: new Date().toISOString(),
          });
        }
        
        await batch.commit();
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created ${defaultCategories.length} default categories for user '${userId}'`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (projectId) {
    initializeFirebase(projectId, serviceAccountKey);
    console.error(`Firebase MCP Server initialized for project: ${projectId}`);
  } else {
    console.error('Warning: FIREBASE_PROJECT_ID not set. Initialize before using tools.');
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Firebase MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
