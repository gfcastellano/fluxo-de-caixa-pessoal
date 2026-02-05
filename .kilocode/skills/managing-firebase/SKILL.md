---
name: managing-firebase
description: Manages Firebase projects and services via MCP. Use when the user mentions Firebase, project configuration, app registration, security rules, Firestore, Realtime Database, Firebase Hosting, Data Connect, or authentication setup. Triggers on keywords like 'Firebase', 'Firestore', 'RTDB', 'security rules', 'firebase init', 'SDK config', 'Android SHA'.
---

# Managing Firebase via MCP

This skill provides instructions for interacting with Firebase through MCP tools.

---

## Quick Reference: Tool Categories

| Category | Tools |
|----------|-------|
| **Auth** | `firebase_login`, `firebase_logout` |
| **Environment** | `firebase_get_environment`, `firebase_update_environment` |
| **Projects** | `firebase_get_project`, `firebase_list_projects`, `firebase_create_project` |
| **Apps** | `firebase_list_apps`, `firebase_create_app`, `firebase_get_sdk_config` |
| **Android** | `firebase_create_android_sha` |
| **Initialize** | `firebase_init` |
| **Security** | `firebase_get_security_rules` |
| **Resources** | `firebase_read_resources` |

---

## Core Patterns

### Pre-Flight Check
Before any Firebase operation, verify the environment:
```
firebase_get_environment()
```
Returns: authenticated user, project directory, active project, and more.

### Authentication Flow
If not authenticated:
```
firebase_login()
```
> **Note**: This initiates an OAuth flow requiring a Google Account.

To sign out:
```
firebase_logout(email: "optional@email.com")  # Omit to log out all accounts
```

### Project Context
Most tools require an active project. Ensure one is set:
```
firebase_update_environment(active_project: "my-firebase-project-id")
```

---

## Environment Operations

### Get Current Environment
```
firebase_get_environment()
```
Returns:
- Current authenticated user
- Project directory
- Active Firebase Project
- CLI configuration status

### Update Environment
```
firebase_update_environment(
  project_dir: "/path/to/project",
  active_project: "project-id",
  active_user_account: "user@email.com"
)
```

---

## Project Operations

### List Projects
```
firebase_list_projects(page_size: 20, page_token: "token")
```

### Get Active Project Details
```
firebase_get_project()
```

### Create New Project
```
firebase_create_project(
  project_id: "my-new-project",
  display_name: "My New Firebase App"
)
```
> **Important**: Project IDs are globally unique and cannot be changed.

---

## App Operations

### List Registered Apps
```
firebase_list_apps(platform: "all" | "ios" | "android" | "web")
```

### Create New App

**Web App:**
```
firebase_create_app(platform: "web", display_name: "My Web App")
```

**Android App:**
```
firebase_create_app(
  platform: "android",
  display_name: "My Android App",
  android_config: { "package_name": "com.example.myapp" }
)
```

**iOS App:**
```
firebase_create_app(
  platform: "ios",
  display_name: "My iOS App",
  ios_config: { "bundle_id": "com.example.myapp", "app_store_id": "123456789" }
)
```

### Get SDK Configuration
```
firebase_get_sdk_config(platform: "web" | "ios" | "android")
# or by app ID:
firebase_get_sdk_config(app_id: "1:123456789:web:abc123def456")
```

### Add SHA Certificate (Android)
```
firebase_create_android_sha(
  app_id: "1:123456789:android:abc123def456",
  sha_hash: "AA:BB:CC:DD:EE:FF:..."
)
```
> **Tip**: Get SHA-1 with `./gradlew signingReport` in Android project.

---

## Firebase Initialization

### Initialize Services
```
firebase_init(
  features: {
    "firestore": { "database_id": "(default)", "location_id": "nam5" },
    "database": { "rules_filename": "database.rules.json" },
    "storage": { "rules_filename": "storage.rules" },
    "hosting": { "public_directory": "public", "single_page_app": true }
  }
)
```

---

## Security Rules

### Get Security Rules
```
firebase_get_security_rules(type: "firestore" | "rtdb" | "storage")
```

---

## Resources

### Read Firebase Resources
```
firebase_read_resources()  # List all
firebase_read_resources(uris: ["firebase://project/config"])
```

---

## Deployment

After initialization, deploy with Firebase CLI:
```bash
firebase deploy
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

---

## Best Practices

1. **Environment First**: Always call `firebase_get_environment` before starting
2. **Set Project Directory**: Use `firebase_update_environment` to set the correct working directory
3. **Verify Project**: Confirm the active project with `firebase_get_project`
4. **Init Selectively**: Only initialize services you need
5. **Check Rules**: Review security rules before deploying
