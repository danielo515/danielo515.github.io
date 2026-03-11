/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

// Take control immediately on install/activate
sw.addEventListener("install", () => sw.skipWaiting());
sw.addEventListener("activate", (event) =>
  event.waitUntil(sw.clients.claim()),
);

/** @type {number} Timer id for the pending notification. 0 = inactive */
let timerId = 0;

function showDoneNotification() {
  sw.registration.showNotification("Rest Timer", {
    body: "Time's up! Get back to work 💪",
    icon: "/favicon.svg",
    tag: "rest-timer",
    requireInteraction: true,
    vibrate: [300, 100, 300],
  });
}

sw.addEventListener("message", (event) => {
  const { type, delayMs } = event.data || {};

  if (type === "START_TIMER") {
    // Clear any previous timer
    if (timerId) clearTimeout(timerId);
    // Schedule a single timeout for the exact delay.
    // Use waitUntil so the SW stays alive for the duration.
    event.waitUntil(
      new Promise((resolve) => {
        timerId = /** @type {any} */ (
          setTimeout(() => {
            timerId = 0;
            showDoneNotification();
            resolve();
          }, delayMs)
        );
      }),
    );
  }

  if (type === "STOP_TIMER") {
    if (timerId) {
      clearTimeout(timerId);
      timerId = 0;
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
