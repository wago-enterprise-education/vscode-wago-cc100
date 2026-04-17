# Create GitHub Release Workflow Usage Guide

This document explains how the GitHub Actions workflow automatically creates GitHub releases when release branches are merged into main. This workflow acts as the trigger point for the entire publication chain.

## 🚀 Automatic Release Creation

The workflow automatically triggers when a release branch is merged into main via Pull Request.

**What happens:**

1. Triggers on PR merge from `release/v*` → `main`
2. Extracts version number from branch name (e.g., `release/v0.2.5` → `0.2.5`)
3. Parses `CHANGELOG.md` to extract release notes for that version
4. Creates GitHub Release with tag `v{version}` and extracted changelog content
5. Triggers downstream workflows: [Build VSIX](build-vsix.md) → [Publish to Marketplace](publish-marketplace.md)

**How to trigger:**

1. Create a release branch using [Start Release Branch](start-release-branch.md) workflow
2. Make necessary changes on the release branch
3. Create Pull Request from `release/v{version}` → `main`
4. Merge the Pull Request
5. The workflow runs automatically and creates the GitHub release

## 📋 Workflow Chain

```text
Start Release Branch → Development → PR Merge → Create GitHub Release → Build VSIX → Publish Marketplace
```

| Step | Workflow | Trigger | Output |
| ---- | -------- | ------- | ------ |
| 1 | [Start Release Branch](start-release-branch.md) | Manual dispatch | `release/v{version}` branch |
| 2 | **Create GitHub Release** | PR Merge (`release/v*` → `main`) | GitHub Release with tag |
| 3 | [Build VSIX](build-vsix.md) | Release creation | VSIX attached to release |
| 4 | [Publish to Marketplace](publish-marketplace.md) | Build VSIX completion | Extension published |

## 🔍 Version Detection

The workflow automatically extracts the version from the release branch name:

**Supported branch patterns:**

- `release/v1.2.3` → Version: `1.2.3`, Tag: `v1.2.3`
- `release/v0.2.5` → Version: `0.2.5`, Tag: `v0.2.5`

**Invalid patterns (workflow will not trigger):**

- `feature/new-feature`
- `hotfix/bug-fix`
- `release-v1.2.3` (missing slash)
- `release/1.2.3` (missing 'v' prefix)

## 📝 CHANGELOG Processing

The workflow automatically extracts release notes from `CHANGELOG.md`:

### Expected CHANGELOG Format

```markdown
# Change Log

## [Unreleased]

## [0.2.5] - 2026-04-17

### Changed
- Force Node 24 for workflows
- Update packages

### Fixed
- CVE-2026-40186 sanitize-html vulnerability

## [0.2.4] - 2026-03-27

### Added
- New feature descriptions
```

### Extraction Logic

- **Start point:** Line containing `## [0.2.5]` (exact version match)
- **End point:** Next version section `## [0.2.4]` or end of file
- **Content:** All text between start and end points (excluding version headers)
- **Fallback:** If no content found, creates generic release notes with CHANGELOG link

## 🛡️ Security & Permissions

### Environment Protection

- **Environment:** `release`
- **Deployment:** `false` (no deployment protection, but environment restrictions apply)
- **Required permissions:** Maintainer access to trigger workflow

### GitHub Permissions

The workflow requires:

- **Contents:** `write` (to create releases)
- **Pull requests:** `read` (to detect PR merges)

## ❌ Troubleshooting

### Workflow Not Triggering

**Check these conditions:**

1. ✅ PR was actually merged (not just closed)
2. ✅ Source branch follows `release/v*` pattern exactly
3. ✅ Target branch is `main`
4. ✅ User has maintainer permissions

### Version Not Detected

**Common issues:**

- Branch name doesn't start with `release/v`
- Version format is invalid (must be semantic versioning)
- Extra characters in branch name

### No Release Notes Found

**When this happens:**

- CHANGELOG.md doesn't contain section for the version
- Version format in CHANGELOG doesn't match branch version
- Markdown formatting is incorrect

**Fallback behavior:**

- Creates generic release notes with link to CHANGELOG.md
- Release creation still succeeds

## 🔗 Related Workflows

- **Previous step:** [Start Release Branch](start-release-branch.md) - Creates the release branch
- **Next step:** [Build VSIX](build-vsix.md) - Builds extension package
- **Final step:** [Publish to Marketplace](publish-marketplace.md) - Publishes to VS Code Marketplace
- **Utility:** [Verify Marketplace PAT](verify-marketplace-pat.md) - Validates publishing credentials
