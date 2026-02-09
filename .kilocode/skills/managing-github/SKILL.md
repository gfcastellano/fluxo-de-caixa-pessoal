---
name: managing-github
description: Manages GitHub repositories via MCP. Use when the user mentions GitHub, repositories, issues, pull requests, commits, branches, releases, tags, code search, or repository management. Triggers on keywords like 'PR', 'issue', 'commit', 'branch', 'merge', 'fork', 'release', 'GitHub search'.
---

# Managing GitHub via MCP

This skill provides instructions for interacting with GitHub through MCP tools.

---

## Quick Reference: Tool Categories

| Category | Tools |
|----------|-------|
| **User** | `get_me` |
| **Repository** | `create_repository`, `fork_repository`, `search_repositories` |
| **Files** | `get_file_contents`, `create_or_update_file`, `delete_file`, `push_files` |
| **Branches** | `create_branch`, `list_branches` |
| **Commits** | `get_commit`, `list_commits` |
| **Issues** | `issue_read`, `issue_write`, `list_issues`, `search_issues`, `add_issue_comment` |
| **Pull Requests** | `create_pull_request`, `pull_request_read`, `list_pull_requests`, `merge_pull_request` |
| **Reviews** | `pull_request_review_write`, `add_comment_to_pending_review` |
| **Releases** | `list_releases`, `get_latest_release`, `get_release_by_tag` |
| **Tags** | `list_tags`, `get_tag` |
| **Search** | `search_code`, `search_issues`, `search_pull_requests`, `search_users` |

---

## Core Patterns

### Authentication Check
Always start by verifying authentication if user context is needed:
```
get_me()
```
Returns: username, email, avatar URL, and other profile details.

### Owner/Repo Pattern
Most tools require `owner` and `repo` parameters:
- **owner**: Repository owner (username or organization)
- **repo**: Repository name (not full URL)

Example: For `https://github.com/gfcastellano/my-project`:
- `owner`: `gfcastellano`
- `repo`: `my-project`

---

## Repository Operations

### Create Repository
```
create_repository(
  name: "repo-name",
  description: "Optional description",
  private: true/false,
  autoInit: true/false
)
```

### Fork Repository
```
fork_repository(owner: "original-owner", repo: "repo-name")
```

### Get File Contents
```
get_file_contents(owner: "owner", repo: "repo", path: "path/to/file")
```

---

## Branch Operations

### Create Branch
```
create_branch(owner: "owner", repo: "repo", branch: "new-branch-name")
```

### List Branches
```
list_branches(owner: "owner", repo: "repo")
```

---

## Issue Operations

### Read Issue
```
issue_read(method: "get", owner: "owner", repo: "repo", issue_number: 123)
```

### Create Issue
```
issue_write(
  method: "create",
  owner: "owner",
  repo: "repo",
  title: "Issue title",
  body: "Issue description",
  labels: ["bug", "priority-high"]
)
```

### Add Comment
```
add_issue_comment(owner: "owner", repo: "repo", issue_number: 123, body: "Comment")
```

---

## Pull Request Operations

### Create Pull Request
```
create_pull_request(
  owner: "owner",
  repo: "repo",
  title: "PR Title",
  body: "PR Description",
  head: "feature-branch",
  base: "main"
)
```

### Read Pull Request
```
pull_request_read(
  method: "get" | "get_diff" | "get_status" | "get_files",
  owner: "owner",
  repo: "repo",
  pullNumber: 123
)
```

### Merge Pull Request
```
merge_pull_request(
  owner: "owner",
  repo: "repo",
  pullNumber: 123,
  merge_method: "merge" | "squash" | "rebase"
)
```

---

## Code Review

### Create/Submit Review
```
pull_request_review_write(
  method: "create",
  owner: "owner",
  repo: "repo",
  pullNumber: 123,
  body: "Review comment",
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
)
```

---

## File Operations (Remote)

### Create or Update File
```
create_or_update_file(
  owner: "owner",
  repo: "repo",
  path: "path/to/file.txt",
  content: "File content",
  message: "Commit message",
  branch: "branch-name"
)
```

### Push Multiple Files
```
push_files(
  owner: "owner",
  repo: "repo",
  branch: "branch-name",
  message: "Commit message",
  files: [{ "path": "file1.txt", "content": "content1" }]
)
```

---

## Search Operations

### Search Code
```
search_code(query: "function_name language:javascript repo:owner/repo")
```

### Search Repositories
```
search_repositories(query: "machine learning stars:>1000 language:python")
```

### Search Issues
```
search_issues(query: "bug is:open label:priority-high", owner: "owner", repo: "repo")
```

---

## Releases & Tags

### List Releases
```
list_releases(owner: "owner", repo: "repo")
```

### Get Latest Release
```
get_latest_release(owner: "owner", repo: "repo")
```

---

## Pagination

Most list/search operations support pagination:
- `page`: Page number (1-indexed)
- `perPage`: Results per page (max 100)

---

## Error Handling

- If a tool fails, check authentication with `get_me`
- Verify `owner` and `repo` are correct (not full URL)
- For file updates, ensure you have the correct `sha`
