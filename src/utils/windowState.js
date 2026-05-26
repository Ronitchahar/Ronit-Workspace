/**
 * Window State Preservation Utility
 */

const WINDOW_STATE_STORAGE_KEY = "ronit_window_state";

let intervalId = null;

export const preserveWindowState = () => {
  try {
    const state = {
      timestamp: Date.now(),
      url: window.location.href,
      scroll: {
        x: window.scrollX,
        y: window.scrollY,
      },
    };

    sessionStorage.setItem(
      WINDOW_STATE_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (e) {
    console.warn("Could not save window state:", e);
  }
};

export const startWindowStatePreservation = () => {
  if (intervalId) return;

  preserveWindowState();

  intervalId = setInterval(() => {
    preserveWindowState();
  }, 5000);

  window.addEventListener("beforeunload", preserveWindowState);
};

export const stopWindowStatePreservation = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  window.removeEventListener("beforeunload", preserveWindowState);
};

export const restoreWindowState = () => {
  try {
    const saved = sessionStorage.getItem(WINDOW_STATE_STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not restore window state:", e);
  }

  return null;
};