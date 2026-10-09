import { JazzReactProvider, useAccount } from "jazz-tools/react";
import { FilePlus2, Trash2 } from "lucide-react";
import { DraftEditor } from "./DraftEditor";
import { SyncPanel } from "./SyncPanel";
import {
  BlogEditorAccount,
  createDraft,
  draftTitle,
  type LoadedBlogDraft,
} from "./schema/Draft";

const SYNC_PEER =
  "wss://cloud.jazz.tools/?key=blog-editor@danielo515.github.io";

/**
 * A fully client-side editor for new blog entries. Nothing is posted to a
 * backend of mine: drafts live in Jazz (local first, synced when you enable
 * it) and publishing goes straight from the browser to GitHub.
 */
export default function BlogEditorApp({
  tagSuggestions = [],
}: {
  tagSuggestions?: string[];
}) {
  return (
    <JazzReactProvider
      sync={{ peer: SYNC_PEER }}
      AccountSchema={BlogEditorAccount}
      fallback={<Loading />}
    >
      <Editor tagSuggestions={tagSuggestions} />
    </JazzReactProvider>
  );
}

function Loading({ message = "Cargando borradores…" }: { message?: string }) {
  return (
    <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
      {message}
    </p>
  );
}

function Editor({ tagSuggestions }: { tagSuggestions: string[] }) {
  const me = useAccount(BlogEditorAccount, {
    resolve: { root: { drafts: { $each: { tags: true } } } },
  });

  if (!me.$isLoaded) {
    if (me.$jazz.loadingState === "unauthorized")
      return <Loading message="No tienes acceso a esta cuenta." />;
    if (me.$jazz.loadingState === "unavailable")
      return <Loading message="No se pudo cargar tu cuenta." />;
    return <Loading />;
  }

  const root = me.root;
  const drafts = root.drafts;

  const addDraft = () => {
    const draft = createDraft(drafts.$jazz.owner);
    drafts.$jazz.push(draft);
    root.$jazz.set("currentDraftId", draft.$jazz.id);
  };

  const removeDraft = (draft: LoadedBlogDraft) => {
    const label = draftTitle(draft);
    if (!window.confirm(`¿Borrar «${label}»? No se puede deshacer.`)) return;
    const index = drafts.findIndex(
      (candidate) => candidate.$jazz.id === draft.$jazz.id,
    );
    if (index >= 0) drafts.$jazz.remove(index);
    if (root.currentDraftId === draft.$jazz.id)
      root.$jazz.set("currentDraftId", "");
  };

  // Fall back to the most recent draft when the stored selection points at
  // something that no longer exists (deleted here or on another device).
  const current =
    drafts.find((draft) => draft.$jazz.id === root.currentDraftId) ??
    drafts[drafts.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {drafts.map((draft) => {
            const active = draft.$jazz.id === current?.$jazz.id;
            return (
              <span
                key={draft.$jazz.id}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  active
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200"
                    : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    root.$jazz.set("currentDraftId", draft.$jazz.id)
                  }
                  className="max-w-48 truncate"
                >
                  {draftTitle(draft)}
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(draft)}
                  aria-label={`Borrar ${draftTitle(draft)}`}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addDraft}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <FilePlus2 size={14} /> Nuevo borrador
        </button>
      </div>

      {current ? (
        <DraftEditor
          key={current.$jazz.id}
          draft={current}
          tagSuggestions={tagSuggestions}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Todavía no hay ningún borrador. Empieza uno y se irá guardando
            solo mientras escribes.
          </p>
        </div>
      )}

      <SyncPanel />
    </div>
  );
}
