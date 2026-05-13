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
5. Build VSIX (Automatic - triggered by release)
   ↓
6. Publish to Marketplace (Automatic - triggered by build)
```

**One-time setup:** [Verify Marketplace PAT](verify-marketplace-pat.md) ensures publishing credentials are valid.

## �📁 Workflow Overview

| Workflow | Purpose | Trigger | Documentation |
| -------- | ------- | ------- | ------------- |
| **Start Release Branch** | Creates versioned release branches from main | Manual dispatch | [start-release-branch.md](start-release-branch.md) |
| **Create GitHub Release** | Creates GitHub releases from merged release branches | PR merge (`release/v*` → `main`) | [create-github-release.md](create-github-release.md) |
| **Build VSIX** | Creates extension packages (.vsix files) | Release creation, Manual dispatch | [build-vsix.md](build-vsix.md) |
| **Publish to Marketplace** | Publishes extension to VS Code Marketplace | After successful Build VSIX (releases only) | [publish-marketplace.md](publish-marketplace.md) |
| **Verify Marketplace PAT** | Validates marketplace publishing credentials | Manual dispatch | [verify-marketplace-pat.md](verify-marketplace-pat.md) |
