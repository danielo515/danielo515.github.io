import { buildPublishableFiles } from "@/lib/blogMarkdown";
import {
  DEFAULT_TARGET,
  GitHubError,
  branchNameFor,
  prefillFitsInUrl,
  prefilledEditorUrl,
  publishViaApi,
} from "@/lib/github";
import { AlertTriangle, ExternalLink, GitPullRequest } from "lucide-react";
import { useState } from "react";
import type { DraftValues } from "./draftValues";

/**
 * The token never goes into Jazz — Jazz syncs to a shared cloud peer, and a
 * repo-write credential has no business being replicated there. localStorage
 * on this device only, and only if the user opts in.
 */
const TOKEN_KEY = "blog-editor-github-token";

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the token simply won't be remembered */
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; url: string; number: number }
  | { kind: "error"; message: string };

export function PublishPanel({ draft }: { draft: DraftValues }) {
  const [token, setToken] = useState(readToken);
  const [remember, setRemember] = useState(() => readToken() !== "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const built = buildPublishableFiles(draft);
  const canPublish = built.ok;

  const openPrefilled = () => {
    if (!built.ok) return;
    window.open(
      prefilledEditorUrl(DEFAULT_TARGET, built.post),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const publish = async () => {
    if (!built.ok || !token.trim()) return;
    setStatus({ kind: "working" });
    writeToken(remember ? token.trim() : "");

    try {
      const result = await publishViaApi({
        token: token.trim(),
        target: DEFAULT_TARGET,
        post: built.post,
        cover: built.cover,
        branch: branchNameFor(draft.slug),
        commitMessage: `feat(blog): ${draft.title}`,
        prTitle: `feat(blog): ${draft.title}`,
        prBody: [
          draft.description,
          "",
          `Nueva entrada del blog escrita desde el editor de \`/blog/new\`.`,
          "",
          `- Fichero: \`${built.post.path}\``,
          `- Fecha: ${draft.date}`,
          `- Etiquetas: ${draft.tags.join(", ")}`,
          built.cover ? `- Portada: \`${built.cover.name}\`` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      });
      setStatus({ kind: "done", url: result.prUrl, number: result.prNumber });
    } catch (error) {
      const message =
        error instanceof GitHubError
          ? `GitHub (${error.status}): ${error.message}`
          : error instanceof Error
            ? error.message
            : "Error desconocido al publicar";
      setStatus({ kind: "error", message });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
        Publicar
      </h2>

      {!built.ok && (
        <ul className="flex flex-col gap-1">
          {built.errors.map((error) => (
            <li
              key={error}
              className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {error}
            </li>
          ))}
        </ul>
      )}

      {built.ok && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Se creará{" "}
          <code className="text-[11px] text-gray-800 dark:text-gray-200">
            {built.post.path}
          </code>{" "}
          en una rama nueva sobre{" "}
          <code className="text-[11px]">{DEFAULT_TARGET.baseBranch}</code>.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Token de GitHub (opcional)
        </label>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="github_pat_…"
          autoComplete="off"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-100"
        />
        <label className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          Recordarlo en este navegador
        </label>
        <p className="text-[11px] text-gray-500 dark:text-gray-500">
          Token de acceso <em>fine-grained</em> con permisos de{" "}
          <strong>Contents</strong> y <strong>Pull requests</strong> sobre{" "}
          <code className="text-[10px]">
            {DEFAULT_TARGET.owner}/{DEFAULT_TARGET.repo}
          </code>
          . No se sincroniza: se queda en este dispositivo.
        </p>

        <button
          type="button"
          disabled={!canPublish || !token.trim() || status.kind === "working"}
          onClick={publish}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <GitPullRequest size={14} />
          {status.kind === "working" ? "Abriendo PR…" : "Crear pull request"}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-[11px] text-gray-500 dark:text-gray-500">
          ¿Sin token? Abre el editor de GitHub con el artículo ya escrito y
          confirma desde ahí con “Create a new branch and start a pull
          request”.
        </p>
        <button
          type="button"
          disabled={!canPublish}
          onClick={openPrefilled}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-indigo-400 disabled:opacity-50"
        >
          <ExternalLink size={14} />
          Abrir PR en GitHub
        </button>

        {built.ok && !prefillFitsInUrl(DEFAULT_TARGET, built.post) && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            El artículo es largo y puede que no quepa en la URL. Si GitHub lo
            abre truncado, descarga el <code>.md</code> y súbelo a mano, o usa
            un token.
          </p>
        )}
        {built.ok && built.cover && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            La portada sólo se sube con token: el editor de GitHub no acepta
            imágenes por URL.
          </p>
        )}
      </div>

      {status.kind === "done" && (
        <a
          href={status.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-green-50 dark:bg-green-900/30 p-2 text-xs font-medium text-green-700 dark:text-green-300 hover:underline"
        >
          ✓ Pull request #{status.number} creada — ábrela aquí
        </a>
      )}

      {status.kind === "error" && (
        <p className="rounded-md bg-red-50 dark:bg-red-900/30 p-2 text-xs text-red-700 dark:text-red-300">
          {status.message}
        </p>
      )}
    </div>
  );
}
