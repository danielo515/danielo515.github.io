import { X } from "lucide-react";
import { useState } from "react";

/**
 * Tags are free-form strings in the blog collection (unlike projects, which
 * are restricted to the TechTag enum), so this is a plain chip input with
 * the tags already used across the blog offered as suggestions.
 */
export function TagInput({
  id,
  tags,
  suggestions,
  onChange,
}: {
  id: string;
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [pending, setPending] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) {
      setPending("");
      return;
    }
    onChange([...tags, tag]);
    setPending("");
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const unused = suggestions.filter((tag) => !tags.includes(tag)).slice(0, 12);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:text-indigo-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Quitar etiqueta ${tag}`}
              className="rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 p-0.5"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={pending}
          onChange={(event) => setPending(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(pending);
            } else if (
              event.key === "Backspace" &&
              pending === "" &&
              tags.length > 0
            ) {
              remove(tags[tags.length - 1]!);
            }
          }}
          onBlur={() => add(pending)}
          placeholder={tags.length ? "" : "typescript, nix, testing…"}
          className="flex-1 min-w-32 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100"
        />
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
