# Release Workflow Usage Guide

This document explains how to use the GitHub Actions workflow for building the vsix package of the "vscode-wago-cc100" extension. The workflow is designed to automatically build and attach the vsix file to GitHub releases, as well as allow manual triggering for development builds from any branch, tag, or specific commit.

## 🚀 Automatic Release Build

The workflow automatically triggers when a new release is created on GitHub.

**What happens:**

- Builds VSIX from the release tag
- Attaches the VSIX file to the GitHub release
- Uses official release naming (matches GitHub release)

**How to trigger:**

1. Create a new release on GitHub (via web UI or `gh release create`)
2. The workflow runs automatically
3. VSIX is attached to the release for download

## 🛠️ Manual Build (GitHub UI)

Create development builds from any branch, tag, or specific commit.

### Build from Branch/Tag HEAD

1. Go to **Actions** → **Build VSIX**
2. Click **"Run workflow"**
3. Select desired branch/tag from dropdown
4. Leave `commit_sha` field empty
5. Click **"Run workflow"**

**Result:** Artifact named `vscode-wago-cc100-v{version}-{hash}.vsix`

### Build from Specific Commit

1. Go to **Actions** → **Build VSIX**
2. Click **"Run workflow"**
3. Select any branch from dropdown (doesn't matter which)
4. Enter specific commit SHA in `commit_sha` field
5. Click **"Run workflow"**

**Result:** Artifact named `vscode-wago-cc100-v{version}-{hash}.vsix`

## 💻 Command Line Usage (GitHub CLI)

### Prerequisites

```bash
# Install GitHub CLI if not already installed
# Windows: winget install GitHub.cli
# macOS: brew install gh
# Linux: See https://github.com/cli/cli#installation

# Authenticate
gh auth login
```

### Build from Branch/Tag

```bash
# Build from main branch
gh workflow run release.yml --ref main

# Build from specific branch
gh workflow run release.yml --ref release/v0.2.4

# Build from tag
gh workflow run release.yml --ref v0.2.3
```

### Build from Specific Commit

```bash
# Method 1: Use commit SHA directly as ref
gh workflow run release.yml --ref a1b2c3d4f5e6
```

### Monitor Workflow

```bash
# List recent workflow runs
gh run list --workflow=release.yml

# Watch specific run (use ID from list)
gh run watch 1234567890

# Download artifacts from completed run
gh run download 1234567890
```

## 📦 Artifact Naming Convention

### Manual Builds

**Format:** `vscode-wago-cc100-v{version}-{hash}`

**Examples:**

- `vscode-wago-cc100-v0.2.4-dev.0-a1b2c3d4` (from release/v0.2.4 in development mode)
- `vscode-wago-cc100-v0.2.3-f7e8d9c1` (from main at a specific commit)

**Components:**

- `{version}`: Extracted from package.json automatically
- `{hash}`: 8-character commit SHA of the built code

### Release Builds

**Format:** Standard VSIX naming from `vsce package`

- Attached directly to GitHub release
- No `-dev` suffix

## 🔍 Finding Your Build

### GitHub UI

1. Go to **Actions** tab
2. Click on your workflow run
3. Scroll to **Artifacts** section
4. Download the VSIX file

### Command Line

```bash
# List artifacts from latest run
gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId' | xargs gh run download

# Download specific run artifacts
gh run download <run-id>
```

## ⚡ Quick Reference

| Scenario | Command | Output |
|----------|---------|--------|
| Auto release | Create GitHub release | VSIX attached to release |
| Build main | `gh workflow run release.yml --ref main` | `vscode-wago-cc100-v{version}-{hash}` |
| Build branch | `gh workflow run release.yml --ref feature/abc` | `vscode-wago-cc100-v{version}-{hash}` |
| Build commit | `gh workflow run release.yml --ref a1b2c3d4` | `vscode-wago-cc100-v{version}-{hash}` |
| Build with input | `gh workflow run release.yml --ref main -f commit_sha=abc123` | `vscode-wago-cc100-v{version}-{hash}` |

## 📝 Notes

- **Version detection:** Always uses version from `package.json` at build time
- **Commit hash:** Always reflects the actual commit being built
- **Manual builds:** Always create artifacts, never attach to releases
- **Retention:** Artifacts are kept for 30 days
- **Build consistency:** Same commit always produces same hash in artifact name
