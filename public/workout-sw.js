/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self;

// Take control immediately on install/activate
sw.addEventListener("install", () => sw.skipWaiting());
sw.addEventListener("activate", (event) =>
  event.waitUntil(sw.clients.claim()),
);

/** @type {number} Timestamp (ms) when the timer should fire. 0 = inactive */
let fireAt = 0;

/**
 * Keeps the SW alive by polling every second until the target time.
 * Using waitUntil ensures the browser doesn't kill the SW mid-sleep.
 */
function scheduleNotification(event, targetMs) {
  fireAt = targetMs;

  const poll = () =>
    new Promise((resolve) => {
      const check = () => {
        // Timer was cancelled
        if (fireAt === 0) return resolve();
        if (Date.now() >= fireAt) {
          fireAt = 0;
          sw.registration.showNotification("Rest Timer", {
            body: "Time's up! Get back to work 💪",
            icon: "/favicon.svg",
            tag: "rest-timer",
            requireInteraction: true,
            vibrate: [300, 100, 300],
          });
          return resolve();
        }
        setTimeout(check, 1000);
      };
      check();
    });

  event.waitUntil(poll());
}

sw.addEventListener("message", (event) => {
  const { type, delayMs } = event.data || {};

  if (type === "START_TIMER") {
    scheduleNotification(event, Date.now() + delayMs);
  }

  if (type === "STOP_TIMER") {
    fireAt = 0; // poll loop will exit on next check
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
