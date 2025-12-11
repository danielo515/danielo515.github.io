---
tags: 
  - systems 
  - version control
  - git
title: Undo a Git Commit Without Reverting or Resetting History
description: A little brain dump of the steps I took to configure Loki in the same LXC container where I had Grafana
created: 2025-08-06
date: 2025-08-06
---
Sometimes you want to undo the changes introduced by a Git commit — without using `git revert` or `git reset`.

While `git revert` is safe and doesn't rewrite history, it always creates a new commit. That’s great for traceability, but not always ideal when you want more control or a cleaner commit history.

In this post, I’ll show how to undo a commit by generating a reverse patch using `git diff`. This gives you a clean and flexible way to undo changes — without touching history, and without introducing new commits unless you choose to.

---

## 🔁 Step-by-Step: Undo a Commit Using a Reverse Patch

### 1. Generate the Patch

Create a patch that represents the changes introduced by the last commit:

```bash
git diff HEAD~1 HEAD > undo.patch
````

This file captures exactly what was changed in the last commit.

---

### 2. Apply the Patch in Reverse

Now apply the patch in reverse to undo the commit's changes:

```bash
git apply -R undo.patch
```

Your working directory is now back to the state before the commit — but the commit itself still exists in the history.

---

### 3. (Optional) Stage and Commit

If you are happy with the changes, simply commit the reversed changes:

```bash
git commit -am "Undo previous commit changes without reverting"
```

Or you can keep the changes uncommitted while you test or tweak them further.

---

## ✅ Why Use This Instead of `git revert`?

`git revert` is safe and leaves history intact — but the patch-based approach has distinct advantages:

### 1. **No Extra Commits**

`git revert` always creates a new commit. This method gives you the option to undo silently — or commit later if you choose.

### 2. **Stays in the Working Directory**

Changes are undone directly in the working directory. You can inspect, modify, or stash them as needed before committing.

### 3. **Cleaner Commit History**

Ideal for avoiding revert noise during active development, especially in short-lived branches or before squashing.

### 4. **Easier Experimentation**

You can undo and redo the same patch multiple times while testing or debugging:

```bash
git apply -R undo.patch   # undo
git apply undo.patch      # redo
```

### 5. **Greater Flexibility**

You can generate patches for any commit or range:

```bash
git diff HEAD~3 HEAD > undo.patch
```

Then undo all those changes at once.

---

## 🧪 Bonus: Preview Before Undoing

Dry-run the reverse patch to ensure it applies cleanly:

```bash
git apply -R --check undo.patch
```

View a summary of changes:

```bash
git apply -R --stat undo.patch
```
```
