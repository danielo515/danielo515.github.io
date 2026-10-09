import { wordlist } from "@scure/bip39/wordlists/spanish.js";
import { usePassphraseAuth } from "jazz-tools/react";
import { useState } from "react";

/**
 * Drafts are always stored locally by Jazz; signing up with a passphrase is
 * what pushes them to the sync server so they survive a wiped browser and
 * follow you to another device. Same recovery-phrase flow as the workout
 * tracker.
 */
export function SyncPanel() {
  const auth = usePassphraseAuth({ wordlist });
  const [showPhrase, setShowPhrase] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPhrase, setLoginPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const signedIn = auth.state === "signedIn";

  const enableSync = async () => {
    setBusy(true);
    setError("");
    try {
      await auth.signUp();
      setShowPhrase(true);
    } catch {
      setError("No se pudo activar la sincronización. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const logIn = async () => {
    const phrase = loginPhrase.trim().replace(/\s+/g, " ");
    if (!phrase) return;
    setBusy(true);
    setError("");
    try {
      await auth.logIn(phrase);
      setShowLogin(false);
      setLoginPhrase("");
    } catch {
      setError("La frase no es válida. Revísala e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(auth.passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
        Sincronización
      </h2>

      {signedIn ? (
        <>
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Activa — tus borradores se sincronizan entre dispositivos.
          </p>
          <button
            type="button"
            onClick={() => setShowPhrase((visible) => !visible)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline self-start"
          >
            {showPhrase ? "Ocultar" : "Ver"} frase de recuperación
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Los borradores se guardan en este navegador. Activa la
            sincronización para no perderlos si lo borras o cambias de
            dispositivo.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={enableSync}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Activando…" : "Activar sincronización"}
          </button>
          <button
            type="button"
            onClick={() => setShowLogin((visible) => !visible)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline self-start"
          >
            Ya tengo una frase de recuperación
          </button>
        </>
      )}

      {showLogin && !signedIn && (
        <div className="flex flex-col gap-2">
          <textarea
            value={loginPhrase}
            onChange={(event) => setLoginPhrase(event.target.value)}
            rows={3}
            placeholder="Escribe aquí tus palabras de recuperación"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            disabled={busy}
            onClick={logIn}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </div>
      )}

      {showPhrase && signedIn && (
        <div className="flex flex-col gap-2">
          <p className="rounded-md border border-indigo-300 dark:border-indigo-700 bg-gray-50 dark:bg-gray-900 p-2 text-xs leading-relaxed text-gray-800 dark:text-gray-100">
            {auth.passphrase}
          </p>
          <button
            type="button"
            onClick={copyPhrase}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {copied ? "✓ Copiada" : "Copiar frase"}
          </button>
          <p className="text-[11px] text-gray-500 dark:text-gray-500">
            Guárdala en un lugar seguro: es la única forma de recuperar tus
            borradores desde otro dispositivo.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
