/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

/** @type {ReturnType<typeof setTimeout> | null} */
let timerId = null;

sw.addEventListener("message", (event) => {
  const { type, delayMs } = event.data || {};

  if (type === "START_TIMER") {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      sw.registration.showNotification("Rest Timer", {
        body: "Time's up! Get back to work 💪",
        icon: "/favicon.svg",
        tag: "rest-timer",
        requireInteraction: true,
        vibrate: [300, 100, 300],
      });
    }, delayMs);
  }

  if (type === "STOP_TIMER") {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/workout") && "focus" in client) {
          return client.focus();
        }
      }
      return sw.clients.openWindow("/workout");
    }),
  );
});
