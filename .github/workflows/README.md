# GitHub Actions Workflows Documentation

This directory contains GitHub Actions workflows that automate the CI/CD pipeline for the WAGO CC100 VS Code extension. All workflows are designed to work together to provide a complete development, build, and publishing process.

## � Complete Release Process

The workflows follow this automated chain for releasing extensions:

```text
1. Start Release Branch (Manual) 
   ↓
2. Development & Testing on release/v* branch
   ↓  
3. Create Pull Request (release/v* → main)
   ↓
4. Merge PR → Create GitHub Release (Automatic)
   ↓
5. Build VSIX (Automatic - called by Create GitHub Release via workflow_call)
   ↓
6. Publish to Marketplace (Automatic - triggered by workflow_run on completion)
```

**One-time setup:** [Verify Marketplace PAT](verify-marketplace-pat.md) ensures publishing credentials are valid.

### Why workflow_call instead of event chaining?

GitHub Actions has a deliberate security limitation: **events created by the default `GITHUB_TOKEN` do not trigger other workflows**. This prevents infinite recursive workflow runs.

Previously, "Create GitHub Release" used `GITHUB_TOKEN` to call `gh release create`, which meant the resulting `release: created` event was suppressed and "Build VSIX" was never triggered. The fix uses `workflow_call` to invoke Build VSIX directly as a reusable workflow within the same run, bypassing this limitation entirely.

## �📁 Workflow Overview

| Workflow | Purpose | Trigger | Documentation |
| -------- | ------- | ------- | ------------- |
| **Start Release Branch** | Creates versioned release branches from main | Manual dispatch | [start-release-branch.md](start-release-branch.md) |
| **Create GitHub Release** | Creates GitHub releases from merged release branches | PR merge (`release/v*` → `main`) | [create-github-release.md](create-github-release.md) |
| **Build VSIX** | Creates extension packages (.vsix files) | Release creation, workflow_call, Manual dispatch | [build-vsix.md](build-vsix.md) |
| **Publish to Marketplace** | Publishes extension to VS Code Marketplace | After successful Build VSIX or Create GitHub Release (via workflow_run) | [publish-marketplace.md](publish-marketplace.md) |
| **Verify Marketplace PAT** | Validates marketplace publishing credentials | Manual dispatch | [verify-marketplace-pat.md](verify-marketplace-pat.md) |
