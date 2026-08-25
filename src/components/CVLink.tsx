import { useEffect, useState } from "react";

interface CVLinkProps {
  children: React.ReactNode;
  hash?: string;
  className?: string;
}

const SUPPORTED_LANGUAGES = ["en", "es"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const DEFAULT_LANGUAGE: SupportedLanguage = "en";

function getBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const browserLang = navigator.language.split("-")[0]?.toLowerCase();

  if (
    browserLang &&
    SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)
  ) {
    return browserLang as SupportedLanguage;
  }

  return DEFAULT_LANGUAGE;
}

export default function CVLink({ children, hash, className }: CVLinkProps) {
  const [lang, setLang] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- TODO: reads a browser-only API (navigator.language), so it can't be derived during render/SSR; needs a restructure (e.g. lazy useState initializer guarded for SSR) to avoid the extra render.
    setLang(getBrowserLanguage());
  }, []);

  const href = `/cv/${lang}/${hash ? `#${hash}` : ""}`;

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
