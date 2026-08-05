---
title: Using flake.nix in repos you don't own
description: How to get a personal Nix dev environment on a client's repository without polluting their git history, and why the obvious tricks (like .git/info/exclude) don't actually work.
date: 2026-04-14
tags:
  - nix
  - flakes
  - direnv
  - git
---

As a freelancer I work on a lot of repositories I don't own. I want my own `flake.nix` and `direnv` setup on every one of them, but I absolutely do not want to commit `flake.nix`, `flake.lock`, or `.envrc` to a client's repo. The naive approaches all fail in interesting ways, and the one that finally works hinges on a property of Nix's source code that isn't widely advertised. This post walks through why the obvious tricks are unsafe and what to do instead.

## The setup

You're sitting in a Node.js project with a few hundred MB of `node_modules`. You add a `flake.nix` and `.envrc` so `nix develop` (via direnv) gives you a pinned `nodejs`, `pnpm`, and a few CLI tools. After a while, `nix develop` starts taking minutes. Sometimes it just hangs.

The cause is straightforward: Nix copies the flake source tree into the Nix store before evaluating it. If the flake root is your project directory, "the flake source tree" includes `node_modules`. This is [a known design issue](https://github.com/NixOS/nix/issues/4097), but it's not going away soon.

The first instinct is to hide the flake from the client's git. That instinct is right, but the obvious mechanism is wrong.

## What Nix actually sees in a git flake

When the flake root is a git repo, Nix doesn't naively walk the directory. It uses libgit2 to enumerate files. Specifically, in `src/libfetchers/git-utils.cc`, the function `getWorkdirInfo()` calls `git_status_foreach_ext()` with these flags:

```c
GIT_STATUS_OPT_INCLUDE_UNMODIFIED
GIT_STATUS_OPT_EXCLUDE_SUBMODULES
```

Notably **missing**: `GIT_STATUS_OPT_INCLUDE_UNTRACKED`. Nix only enumerates files that are in the **git index** — i.e., tracked files. Untracked files, regardless of `.gitignore` or `.git/info/exclude` status, are invisible to Nix.

Two consequences fall out of this:

1. An untracked `flake.nix` is invisible to Nix in a git flake. `nix develop` fails with "no flake.nix".
2. The only way Nix sees `flake.nix` is if it's tracked (i.e. you ran `git add` on it).

That second point is the trap. To use a flake inside a git repo, the flake **must be tracked**. And tracked files can be committed.

## The trick that doesn't work

A natural pattern looks like this:

```bash
echo "flake.nix" >> .git/info/exclude
echo "flake.lock" >> .git/info/exclude
git add -f flake.nix flake.lock
```

The `.git/info/exclude` is a local-only ignore list (never committed), and `git add -f` forces the otherwise-ignored file into the index. Nix can now see it. The client's collaborators won't see it in their `.gitignore`. Done?

No. `git status` after this:

```text
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   flake.nix
```

The `.git/info/exclude` rule only suppresses files from the **untracked** set. Once a file is staged, it's a plain tracked addition — it shows up in `git status`, it's included by `git commit -a`, and it's included by a bare `git commit -m "..."` if it was staged earlier. An IDE "Commit" button, a `gh` automation, a teammate's pre-commit hook running `git add -A`, all of them will pick it up.

> **The staging area is not a hiding place. It's literally the "about to be committed" set.**

So this approach gives you a binary choice: either the file is untracked and Nix can't see it, or it's tracked and one careless commit away from the client's remote. There's no middle ground. The mechanism that lets Nix find the file is the same mechanism that exposes it to commit.

## The pattern that actually works

Stop trying to put the flake inside the client's repo. Instead, put the **client project inside a wrapper folder that is your own git repo**, with a `.gitignore` that ignores everything except the flake files:

```gitignore
*
!flake.*
```

Layout:

```text
~/work/clientA/                  ← your wrapper git repo
├── .git/
├── .gitignore                   ← "*" then "!flake.*"
├── flake.nix                    ← tracked (the only thing eligible)
├── flake.lock                   ← tracked
├── .envrc                       ← ignored, but direnv reads it regardless
└── client-project/              ← client's repo, wholly ignored
    ├── .git/
    └── ...massive node_modules...
```

Why this works, point by point:

- **The flake root is the wrapper, not the client project.** Nix's index enumeration finds `flake.nix` and `flake.lock` and copies just those two files into the store. The client subfolder, including `node_modules`, is invisible to Nix because it's not in the wrapper's index.
- **The `*` + `!flake.*` inversion makes the wrong commit impossible.** `git add -A`, `git commit -a`, and IDE "Stage all" buttons can only pick up flake files in the wrapper. There's no `git add` you can run in the wrapper that picks up a client file, because the gitignore filters them out before they reach the index. Safety isn't enforced by discipline; it's enforced by `.gitignore`.
- **The wrapper is your repo, not the client's.** Committing `flake.nix` to it is correct. Push it to your own backup remote if you like. The client's `.git` is in a subfolder that the wrapper ignores wholesale.
- **`.envrc` doesn't need to be tracked.** direnv walks upward from your current directory, finds `.envrc` on disk, and reads it regardless of git status. Drop it in the wrapper and let `*` ignore it.

The result: Nix sees the flake, the flake is a fast git flake (two files copied), nothing leaks into the client's repo, and nothing can be staged into the wrong repo even by mistake.

## Alternatives if a wrapper folder doesn't fit

### Central flake repo + .envrc pointing outside the project

Keep all your flakes in a personal repo, e.g. `~/dev-flakes`, with one devShell per project:

```nix
# ~/dev-flakes/flake.nix
{
  outputs = { nixpkgs, ... }: {
    devShells.x86_64-linux = {
      clientA-projectX = ...;
      clientB-projectY = ...;
    };
  };
}
```

In the client project, the only file you add is an `.envrc`:

```bash
use flake ~/dev-flakes#clientA-projectX
```

Then add `.envrc` and `.direnv` to the **client repo's** `.git/info/exclude`. Nix copies from `~/dev-flakes` (small, well-maintained), so the size problem disappears, and your flake lock is versioned in a repo you control and reusable across clients. The trade-off: `.envrc` is still inside the client's working tree, and the same staging caveat applies if you ever `git add -f` it.

### Zero footprint

If you can't have any file at all in the client's tree, drop direnv and run the shell explicitly:

```bash
nix develop ~/dev-flakes#clientA-projectX
```

Or wrap that in a shell function:

```bash
work() { nix develop ~/dev-flakes#"$1"; }
```

Or use a direnv global hook in `~/.config/direnv/direnvrc` that maps project paths to flakes by `$PWD`, so direnv auto-loads without any file in the project. Nothing you do can ever end up in the client's git history.

### Classic nix-shell + shell.nix

If flake ergonomics aren't worth the hassle, `nix-shell` with a `shell.nix` evaluates in place — no copy to store, no index requirement. You lose flake-style lock files but can still pin nixpkgs with `fetchTarball` and a rev hash:

```nix
# shell.nix
let
  pkgs = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/<rev>.tar.gz") {};
in pkgs.mkShell {
  packages = with pkgs; [ nodejs_22 pnpm ];
}
```

For a `shell.nix`, the `.git/info/exclude` trick is actually fine, because `nix-shell` reads the file directly from disk and doesn't care about the git index at all.

## Takeaways

- **Nix's git flake fetcher only sees the index.** No amount of `.gitignore` or `.git/info/exclude` cleverness changes that.
- **Tracked means committable.** There is no "tracked but unstageable" state in git, and there shouldn't be.
- **The right pattern is to relocate the flake**, not to hide it. A wrapper folder with `*` + `!flake.*` makes the right thing easy and the wrong thing impossible.
- **For zero-touch setups**, direnv global hooks or a manual `nix develop path#shell` give you a Nix dev environment with literally no file in the client's tree.

The wrapper folder is the pattern I now use everywhere. The `.gitignore` does the safety work mechanically, Nix sees a tiny flake root, and the client's repo stays exactly as they left it.
