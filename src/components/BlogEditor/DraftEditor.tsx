import { marked } from "marked";
import { Download, Eye, ImageOff, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildPublishableFiles } from "@/lib/blogMarkdown";
import { PublishPanel } from "./PublishPanel";
import { TagInput } from "./TagInput";
import { toDraftValues } from "./draftValues";
import {
  type LoadedBlogDraft,
  setDraftCover,
  setDraftTags,
  slugify,
  updateDraftField,
} from "./schema/Draft";

/** Cover images travel as data URLs inside a CoValue, so keep them small. */
const MAX_COVER_BYTES = 1_500_000;

const FIELD_CLASS =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-500";
const LABEL_CLASS =
  "text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block";

export function DraftEditor({
  draft,
  tagSuggestions,
}: {
  draft: LoadedBlogDraft;
  tagSuggestions: string[];
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [coverError, setCoverError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // The slug follows the title until the user edits it by hand, at which
  // point it is theirs and we stop touching it.
  const [slugTouched, setSlugTouched] = useState(() => draft.slug !== "");
  const draftId = draft.$jazz.id;
  useEffect(() => {
    setSlugTouched(draft.slug !== "");
    // Only when switching to a different draft — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const values = toDraftValues(draft);

  const previewHtml = useMemo(
    () => marked.parse(values.body || "_Nada que previsualizar todavía._"),
    [values.body],
  );

  const onTitleChange = (title: string) => {
    updateDraftField(draft, "title", title);
    if (!slugTouched) updateDraftField(draft, "slug", slugify(title));
  };

  const onCoverPicked = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      setCoverError(
        `La imagen ocupa ${(file.size / 1_000_000).toFixed(1)} MB. El máximo es 1,5 MB.`,
      );
      return;
    }
    setCoverError("");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setDraftCover(draft, { name: file.name, dataUrl });
  };

  const download = () => {
    const built = buildPublishableFiles(values);
    if (!built.ok) return;
    const blob = new Blob([built.post.content], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${values.slug}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <div>
          <label className={LABEL_CLASS} htmlFor="post-title">
            Título
          </label>
          <input
            id="post-title"
            value={values.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="El título del artículo"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="post-description">
            Descripción
          </label>
          <textarea
            id="post-description"
            value={values.description}
            onChange={(event) =>
              updateDraftField(draft, "description", event.target.value)
            }
            rows={2}
            placeholder="Resumen que se ve en la lista del blog y en las redes"
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="post-date">
              Fecha
            </label>
            <input
              id="post-date"
              type="date"
              value={values.date}
              onChange={(event) =>
                updateDraftField(draft, "date", event.target.value)
              }
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="post-slug">
              Slug (nombre del fichero)
            </label>
            <input
              id="post-slug"
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updateDraftField(draft, "slug", event.target.value);
              }}
              placeholder="mi-articulo"
              className={`${FIELD_CLASS} font-mono text-xs`}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="post-tags">
            Etiquetas
          </label>
          <TagInput
            id="post-tags"
            tags={values.tags}
            suggestions={tagSuggestions}
            onChange={(tags) => setDraftTags(draft, tags)}
          />
        </div>

        <div>
          <span className={LABEL_CLASS}>Portada (opcional)</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void onCoverPicked(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400"
            >
              Elegir imagen
            </button>
            {values.coverDataUrl && (
              <>
                <img
                  src={values.coverDataUrl}
                  alt="Portada elegida"
                  className="h-12 w-20 rounded object-cover border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setDraftCover(draft, null)}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                >
                  <ImageOff size={13} /> Quitar
                </button>
              </>
            )}
          </div>
          {coverError && (
            <p className="mt-1 text-xs text-red-600">{coverError}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className={LABEL_CLASS}>Contenido (Markdown)</span>
            <div className="flex gap-1">
              <TabButton
                active={tab === "write"}
                onClick={() => setTab("write")}
                icon={<Pencil size={12} />}
                label="Escribir"
              />
              <TabButton
                active={tab === "preview"}
                onClick={() => setTab("preview")}
                icon={<Eye size={12} />}
                label="Vista previa"
              />
            </div>
          </div>

          {tab === "write" ? (
            <textarea
              value={values.body}
              onChange={(event) =>
                updateDraftField(draft, "body", event.target.value)
              }
              rows={22}
              spellCheck
              placeholder={"## Un encabezado\n\nY el texto del artículo…"}
              className={`${FIELD_CLASS} font-mono text-[13px] leading-relaxed resize-y`}
            />
          ) : (
            <article
              className="prose prose-sm dark:prose-invert max-w-none min-h-96 overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-4"
              // The only author of this markdown is the person typing it in
              // their own browser — there is no second party to protect from.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 self-start text-xs text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <Download size={13} /> Descargar el .md
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <PublishPanel draft={values} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
        active
          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
          : "text-gray-600 dark:text-gray-400 hover:text-indigo-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
