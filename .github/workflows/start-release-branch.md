# Start Release Branch Workflow Usage Guide

This document explains how to use the GitHub Actions workflow for starting a new release branch. This workflow follows the release procedure outlined in the development documentation by creating a versioned branch from main.

## 🚀 Starting a Release Branch

The workflow creates a new release branch following a structured versioning approach.

**What happens:**

1. Checks out the main branch
2. Bumps version using npm with selected pre-release type and `--preid dev`
3. Creates a new branch named `release/v<version>`
4. Pushes the branch with commit message "start release branch"

## 🛠️ Manual Workflow Execution

### Using GitHub UI

1. Go to **Actions** → **Start Release Branch**
2. Click **"Run workflow"**
3. Select version bump type:
   - **prerelease:** Increments patch number (e.g., 1.0.0 → 1.0.1-dev0)
   - **preminor:** Increments minor version as pre-release (e.g., 1.0.0 → 1.1.0-dev0)
   - **premajor:** Increments major version as pre-release (e.g., 1.0.0 → 2.0.0-dev0)
4. Click **"Run workflow"**

**Result:** New branch `release/v<version>-dev0` created and pushed

### Using GitHub CLI

```bash
# Start a prerelease branch
gh workflow run start-release-branch.yml -f bump_type=prerelease

# Start a preminor release branch
gh workflow run start-release-branch.yml -f bump_type=preminor

# Start a premajor release branch
gh workflow run start-release-branch.yml -f bump_type=premajor
```

## 📋 Version Bump Types Explained

### Prerelease

- **Use case:** Bug fixes, small improvements on current version
- **Example:** 1.0.0 → 1.0.1-dev0
- **When to use:** Most common release type for iterative development

### Preminor

- **Use case:** New features, backwards-compatible changes
- **Example:** 1.0.0 → 1.1.0-dev0
- **When to use:** Adding new functionality without breaking existing features

### Premajor

- **Use case:** Breaking changes, major architectural updates
- **Example:** 1.0.0 → 2.0.0-dev0
- **When to use:** Significant changes that may break compatibility

## 🔗 Related Workflows

- **Next step:** [Create GitHub Release](create-github-release.md) - Automatically creates releases when you merge the release branch
- **Build step:** [Build VSIX](build-vsix.md) - Builds extension packages from releases
- **Final step:** [Publish to Marketplace](publish-marketplace.md) - Publishes to VS Code Marketplace
- **Utility:** [Verify Marketplace PAT](verify-marketplace-pat.md) - Validates publishing credentials
- **Overview:** [All Workflows](README.md) - Complete workflow documentation
