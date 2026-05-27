# Publish to VS Code Marketplace Workflow Usage Guide

This document explains how the GitHub Actions workflow for publishing the vscode-wago-cc100 extension to the VS Code Marketplace works. This workflow automatically publishes the VSIX package after a successful build on release events.

## 🚀 Automatic Publishing

The workflow automatically triggers after a release-related workflow completes successfully. It listens for `workflow_run` completion events from both:

- **"Create GitHub Release"** — the primary path when a release branch is merged via PR
- **"Build VSIX"** — the fallback path when a GitHub release is created manually

**What happens:**

- Downloads the VSIX file from the GitHub release
- Publishes the extension to the VS Code Marketplace
- Requires manual approval via the 'release' environment

**How it triggers:**

1. A release workflow completes (either via PR merge chain or manual release creation)
2. GitHub emits a `workflow_run` event (this is a system-level event from GitHub Actions infrastructure, not subject to `GITHUB_TOKEN` limitations)
3. This workflow starts and resolves the release tag from the triggering workflow's branch:
   - If branch is `release/vX.Y.Z` (from Create GitHub Release): extracts tag as `vX.Y.Z`
   - If branch is `vX.Y.Z` (from direct release trigger): uses it as-is
4. Manual approval is required before publishing (release environment protection)
5. Extension is published to the marketplace using the VSCE_PAT token

## 🛡️ Security & Environment Protection

This workflow is protected by the 'release' environment which should be configured with:

- **Required reviewers:** Only trusted maintainers should approve marketplace publishing
- **Deployment protection rules:** Configure under Settings → Environments → release

## 🔑 Prerequisites

- **VSCE_PAT:** VS Code Marketplace Personal Access Token [see documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
  - Add under Settings → Secrets and variables → Actions
  - Token must have publish permissions for the WAGO-education publisher
  - Use the "Verify Marketplace PAT" workflow to test token validity

- **release:** Environment with protection rules
  - Configure deployment protection rules
  - Add required reviewers who can approve publishing

## 🔗 Related Workflows

- **Triggering workflow (primary):** [Create GitHub Release](create-github-release.md) - Creates GitHub releases and builds VSIX (triggers this workflow via `workflow_run`)
- **Triggering workflow (fallback):** [Build VSIX](build-vsix.md) - Creates VSIX packages (triggers this workflow when run standalone on a `release` event)
- **Release setup:** [Start Release Branch](start-release-branch.md) - Creates versioned release branches
- **Utility:** [Verify Marketplace PAT](verify-marketplace-pat.md) - Validates publishing credentials before use
- **Overview:** [All Workflows](README.md) - Complete workflow documentation
