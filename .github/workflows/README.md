# GitHub Actions Workflows Documentation

This directory contains GitHub Actions workflows that automate the CI/CD pipeline for the WAGO CC100 VS Code extension. All workflows are designed to work together to provide a complete development, build, and publishing process.

## 📁 Workflow Overview

| Workflow | Purpose | Trigger | Documentation |
| -------- | ------- | ------- | ------------- |
| **Build VSIX** | Creates extension packages (.vsix files) | Release creation, Manual dispatch | [build-vsix.md](build-vsix.md) |
| **Publish to Marketplace** | Publishes extension to VS Code Marketplace | After successful Build VSIX (releases only) | [publish-marketplace.md](publish-marketplace.md) |
| **Start Release Branch** | Creates versioned release branches from main | Manual dispatch | [start-release-branch.md](start-release-branch.md) |
| **Verify Marketplace PAT** | Validates marketplace publishing credentials | Manual dispatch | [verify-marketplace-pat.md](verify-marketplace-pat.md) |
