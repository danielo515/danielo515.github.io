import {
  buildPublishableFiles,
  type CoverImage,
  type PostFile,
  type PublishInput,
} from "@/lib/blogMarkdown";

/**
 * Client-side publishing to GitHub. Two routes, because they trade off
 * differently and both are worth having:
 *
 *  - `openPrefilledEditor` needs no credentials at all: it hands GitHub's
 *    own "create new file" screen a filename and a body, and the user
 *    commits from there. Limited by URL length and cannot carry a binary.
 *  - `publishViaApi` needs a fine-grained token with Contents +
 *    Pull requests write, and does the whole branch → commit → PR dance
 *    from the browser.
 *
 * There is no server involved in either.
 */

export const REPO_OWNER = "danielo515";
export const REPO_NAME = "danielo515.github.io";
export const REPO_BASE_BRANCH = "astro";

const API_ROOT = "https://api.github.com";

/**
 * Browsers vary, but every one of them gives up somewhere around 32k of
 * URL. Staying well under keeps the prefilled route predictable.
 */
export const PREFILL_URL_LIMIT = 6000;

export type RepoTarget = {
  owner: string;
  repo: string;
  baseBranch: string;
};

export const DEFAULT_TARGET: RepoTarget = {
  owner: REPO_OWNER,
  repo: REPO_NAME,
  baseBranch: REPO_BASE_BRANCH,
};

/**
 * GitHub's new-file editor accepts `filename` and `value` query params and
 * pre-fills the form with them. Committing from that screen offers "create
 * a new branch and start a pull request", which is the PR interface we are
 * after — without ever holding a token.
 */
export function prefilledEditorUrl(target: RepoTarget, post: PostFile): string {
  const params = new URLSearchParams({
    filename: post.path,
    value: post.content,
  });
  return `https://github.com/${target.owner}/${target.repo}/new/${target.baseBranch}?${params}`;
}

export type PrefillOverflow = {
  /** Characters to delete from the article for the URL to fit. */
  bodyExcess: number;
};

/**
 * How much of the article has to go for the prefilled URL to fit — `null`
 * when it already does.
 *
 * Answered by rebuilding the real file and measuring the real URL, not by
 * costing characters: percent-encoding inflates by a different factor per
 * character, and `buildPostFile` trims the body, so a deleted trailing
 * newline shrinks the article without shrinking the URL. Modelling that
 * left the advice a couple of characters short, which is exactly the
 * "guess again" loop the number is meant to end. Removing more text can
 * never lengthen the URL, so a binary search over how much to keep finds
 * the tight answer.
 */
export function prefillOverflow(
  target: RepoTarget,
  draft: PublishInput,
): PrefillOverflow | null {
  const fits = (body: string) => {
    const built = buildPublishableFiles({ ...draft, body });
    return (
      built.ok && prefilledEditorUrl(target, built.post).length <= PREFILL_URL_LIMIT
    );
  };

  if (fits(draft.body)) return null;

  const characters = [...draft.body];
  const keep = (count: number) => characters.slice(0, count).join("");

  // Largest prefix that still fits. Starts at 1 because the schema rejects
  // an empty body, so a zero-length prefix could never "fit" anyway.
  let low = 1;
  let high = characters.length;
  let best = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (fits(keep(middle))) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  // `best === 0` means even a one-character article overflows — only
  // reachable with an absurdly long title or slug, and cutting prose is
  // still the direction of travel.
  return { bodyExcess: characters.length - best };
}

// ─── TOKEN-BASED PUBLISHING ──────────────────────────────────────────────────

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function api<T>(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { message?: string }) => body.message)
      .catch(() => null);
    throw new GitHubError(
      detail ?? `GitHub respondió ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export type PublishRequest = {
  token: string;
  target: RepoTarget;
  post: PostFile;
  cover: CoverImage | null;
  branch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
};

export type PublishResult = {
  prUrl: string;
  prNumber: number;
  branch: string;
};

/**
 * Creates a branch, commits the post (plus its cover, when there is one) as
 * a single commit via the git data API, and opens the pull request.
 */
export async function publishViaApi(
  request: PublishRequest,
): Promise<PublishResult> {
  const { token, target, post, cover, branch } = request;
  const repoPath = `/repos/${target.owner}/${target.repo}`;

  const baseRef = await api<{ object: { sha: string } }>(
    token,
    `${repoPath}/git/ref/heads/${target.baseBranch}`,
  );
  const baseCommitSha = baseRef.object.sha;

  const baseCommit = await api<{ tree: { sha: string } }>(
    token,
    `${repoPath}/git/commits/${baseCommitSha}`,
  );

  await api(token, `${repoPath}/git/refs`, {
    method: "POST",
    body: { ref: `refs/heads/${branch}`, sha: baseCommitSha },
  });

  // One blob per file. The markdown goes as utf-8; the cover has to be
  // base64 because it is binary.
  const treeEntries: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }> = [];

  const postBlob = await api<{ sha: string }>(token, `${repoPath}/git/blobs`, {
    method: "POST",
    body: { content: post.content, encoding: "utf-8" },
  });
  treeEntries.push({
    path: post.path,
    mode: "100644",
    type: "blob",
    sha: postBlob.sha,
  });

  if (cover) {
    const coverBlob = await api<{ sha: string }>(
      token,
      `${repoPath}/git/blobs`,
      { method: "POST", body: { content: cover.base64, encoding: "base64" } },
    );
    treeEntries.push({
      path: `${post.path.replace(/\/[^/]+$/, "")}/${cover.name}`,
      mode: "100644",
      type: "blob",
      sha: coverBlob.sha,
    });
  }

  const tree = await api<{ sha: string }>(token, `${repoPath}/git/trees`, {
    method: "POST",
    body: { base_tree: baseCommit.tree.sha, tree: treeEntries },
  });

  const commit = await api<{ sha: string }>(token, `${repoPath}/git/commits`, {
    method: "POST",
    body: {
      message: request.commitMessage,
      tree: tree.sha,
      parents: [baseCommitSha],
    },
  });

  await api(token, `${repoPath}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: { sha: commit.sha },
  });

  const pr = await api<{ html_url: string; number: number }>(
    token,
    `${repoPath}/pulls`,
    {
      method: "POST",
      body: {
        title: request.prTitle,
        body: request.prBody,
        head: branch,
        base: target.baseBranch,
      },
    },
  );

  return { prUrl: pr.html_url, prNumber: pr.number, branch };
}

/**
 * Branch names are derived from the slug. The suffix keeps a second attempt
 * at the same post from colliding with the branch left behind by the first.
 */
export function branchNameFor(slug: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 12);
  return `post/${slug}-${stamp}`;
}
