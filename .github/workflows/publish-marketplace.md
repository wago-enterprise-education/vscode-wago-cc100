# Publish to VS Code Marketplace Workflow Usage Guide

This document explains how the GitHub Actions workflow for publishing the vscode-wago-cc100 extension to the VS Code Marketplace works. This workflow automatically publishes the VSIX package after a successful build on release events.

## 🚀 Automatic Publishing

The workflow automatically triggers after the "Build VSIX" workflow completes successfully for a release event.

**What happens:**

- Downloads the VSIX file from the GitHub release
- Publishes the extension to the VS Code Marketplace
- Requires manual approval via the 'release' environment

**How it triggers:**

1. Create a GitHub release (which triggers Build VSIX workflow)
2. After Build VSIX succeeds, this workflow automatically starts
3. Manual approval is required before publishing (release environment protection)
4. Extension is published to the marketplace using the VSCE_PAT token

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

- **Previous step:** [Build VSIX](build-vsix.md) - Creates VSIX packages (automatic trigger)
- **Release creation:** [Create GitHub Release](create-github-release.md) - Creates GitHub releases
- **Release setup:** [Start Release Branch](start-release-branch.md) - Creates versioned release branches
- **Utility:** [Verify Marketplace PAT](verify-marketplace-pat.md) - Validates publishing credentials before use
- **Overview:** [All Workflows](README.md) - Complete workflow documentation
