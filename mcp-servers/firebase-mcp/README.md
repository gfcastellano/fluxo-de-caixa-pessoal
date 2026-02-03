# Firebase MCP Server

A Model Context Protocol (MCP) server for managing Firebase Firestore and Authentication.

## Features

- **Firestore Management**: Create collections, set/get/delete documents, query data
- **Authentication**: Create, get, list, and delete Firebase Auth users
- **Database Setup**: Automated Firestore database initialization
- **Default Data**: Create default categories for new users

## Installation

```bash
cd mcp-servers/firebase-mcp
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'  # Optional
```

## Usage with Claude

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "node",
      "args": ["/path/to/mcp-servers/firebase-mcp/dist/index.js"],
      "env": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "FIREBASE_SERVICE_ACCOUNT_KEY": "{...}"
      }
    }
  }
}
```

## Available Tools

### Firestore Tools

- `firestore_create_collection` - Create a new collection with initial document
- `firestore_set_document` - Set a document
- `firestore_get_document` - Get a document
- `firestore_query` - Query documents with filters
- `firestore_delete_document` - Delete a document

### Auth Tools

- `auth_create_user` - Create a new user
- `auth_get_user` - Get user by UID or email
- `auth_delete_user` - Delete a user
- `auth_list_users` - List all users

### Setup Tools

- `setup_firestore_database` - Initialize Firestore with required collections
- `setup_default_categories` - Create default categories for a user

## Example Usage

```typescript
// Setup Firestore database
{
  "name": "setup_firestore_database",
  "arguments": {
    "projectId": "fluxo-de-caixa-pessoal-d6d3f"
  }
}

// Create default categories for a user
{
  "name": "setup_default_categories",
  "arguments": {
    "userId": "user-uid-here"
  }
}
```
