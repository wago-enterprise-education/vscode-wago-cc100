# Verify Marketplace PAT Workflow Usage Guide

This document explains how to use the GitHub Actions workflow for verifying the VS Code Marketplace Personal Access Token (PAT). This workflow tests whether the VSCE_PAT secret is valid and has the necessary permissions for publishing extensions.

## 🔍 Purpose

The workflow verifies that the marketplace Personal Access Token:

- Is valid and not expired
- Has the correct permissions for the WAGO-education publisher
- Can be used for publishing VS Code extensions

**When to use:**

- Before attempting to publish to the marketplace
- When VSCE_PAT secret has been updated
- Periodically to verify token hasn't expired
- Troubleshooting marketplace publishing issues

## 🛠️ Manual Verification

### Using GitHub UI

1. Go to **Actions** → **Verify Marketplace PAT**
2. Click **"Run workflow"**
3. Select the main branch (or any branch)
4. Click **"Run workflow"**

**Result:** Workflow output shows whether PAT is valid for WAGO-education publisher

### Using GitHub CLI

```bash
# Verify the marketplace PAT
gh workflow run verify-marketplace-pat.yml

# Check the result
gh run list --workflow=verify-marketplace-pat.yml --limit=1
```

## ✅ Expected Output

### Successful Verification

When the PAT is valid, you'll see:

```text
Verifying VSCE_PAT for publisher WAGO-education...
PAT is valid!
```

### Failed Verification

Common failure messages and meanings:

**"Invalid credentials":**

- PAT is expired or revoked
- PAT was not created correctly
- Wrong token provided

**"Publisher not found":**

- PAT doesn't have access to WAGO-education publisher
- Token belongs to a different publisher account

**"Authentication failed":**

- Token format is incorrect
- Network connectivity issues
- VS Code Marketplace service issues

## 📋 Token Management Best Practices

### Creating a Valid PAT

1. Visit [VS Code Marketplace Publisher Portal](https://marketplace.visualstudio.com/)
2. Sign in with WAGO-education publisher account
3. Go to publisher settings
4. Create a new Personal Access Token
5. Copy token immediately (shown only once)

### Token Permissions

The PAT must have:

- **Marketplace:** Manage extensions permission
- **Publisher:** WAGO-education access
- **Scope:** Marketplace publishing rights

### Token Rotation

1. Create new PAT before old one expires
2. Update VSCE_PAT secret
3. Run verify workflow to confirm
4. Revoke old PAT from marketplace
