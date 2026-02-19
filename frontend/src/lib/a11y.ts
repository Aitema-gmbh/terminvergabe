/**
 * aitema|Termin - Accessibility (A11y) Utilities
 *
 * ARIA Live Region Announcements, Focus Management,
 * Skip-Link Handler, Animation Check und Leichte-Sprache Mappings.
 */

// ---------------------------------------------------------------------------
// ARIA Live Region Announcements
// ---------------------------------------------------------------------------

let liveRegion: HTMLElement | null = null;

function ensureLiveRegion(): HTMLElement {
  if (liveRegion && document.body.contains(liveRegion)) {
    return liveRegion;
  }

  liveRegion = document.createElement("div");
  liveRegion.id = "aitema-a11y-live";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");

  // Visually hidden but readable by screen readers
  Object.assign(liveRegion.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });

  document.body.appendChild(liveRegion);
  return liveRegion;
}

/**
 * Announce a message to screen readers via ARIA live region.
 * @param message  Text to announce
 * @param priority "polite" (default) or "assertive" for urgent messages
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  if (typeof document === "undefined") return;

  const region = ensureLiveRegion();
  region.setAttribute("aria-live", priority);

  // Clear then set so assistive tech detects the change
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

// ---------------------------------------------------------------------------
// Focus Trap
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(", ");

interface FocusTrapHandle {
  activate: () => void;
  deactivate: () => void;
}

/**
 * Create a focus trap within a container element.
 * Keyboard focus cycles through focusable children (Tab / Shift+Tab).
 */
export function focusTrap(container: HTMLElement): FocusTrapHandle {
  let previouslyFocused: HTMLElement | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
    );
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return {
    activate() {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    },
    deactivate() {
      container.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Skip to Main Content
// ---------------------------------------------------------------------------

/**
 * Handle skip-to-main-content link click.
 * Focuses the <main> element or element with id="main-content".
 */
export function skipToMain(): void {
  if (typeof document === "undefined") return;

  const main =
    document.querySelector<HTMLElement>("main") ||
    document.getElementById("main-content");

  if (main) {
    if (!main.hasAttribute("tabindex")) {
      main.setAttribute("tabindex", "-1");
    }
    main.focus();
    main.scrollIntoView({ behavior: "smooth" });
  }
}

// ---------------------------------------------------------------------------
// Reduced Motion
// ---------------------------------------------------------------------------

/**
 * Check whether the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Subscribe to reduced-motion preference changes.
 */
export function onReducedMotionChange(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

// ---------------------------------------------------------------------------
// Leichte Sprache (Easy Language) Mappings for Terminvergabe
// ---------------------------------------------------------------------------

/**
 * Plain-language alternatives for common Terminvergabe domain terms.
 * Intended for a "Leichte Sprache" toggle in the UI.
 */
export const leichteSprache: Record<string, string> = {
  Terminvergabe: "Einen Termin bekommen",
  Dienstleistung: "Das, was Sie erledigen möchten",
  Wartenummer: "Ihre Nummer zum Warten",
  Standort: "Der Ort, wo Sie hingehen",
  Einchecken: "Sagen, dass Sie da sind",
  Stornieren: "Den Termin absagen",
  "Bestätigung": "Ja, der Termin ist sicher",
  Buchung: "Einen Termin aussuchen",
  Referenznummer: "Die Nummer für Ihren Termin",
  "Geschätzte Wartezeit": "So lange müssen Sie ungefähr warten",
  Barrierefreiheit: "Für alle Menschen gut erreichbar",
  Rollstuhlgerecht: "Gut für Menschen im Rollstuhl",
  "Mitzubringende Unterlagen": "Das müssen Sie mitbringen",
  Personalausweis: "Der Ausweis mit Ihrem Foto",
  Aufenthaltstitel: "Das Papier, das sagt: Sie dürfen hier leben",
  Meldebescheinigung: "Das Papier, das zeigt wo Sie wohnen",
};

/**
 * Convert a term to its Leichte-Sprache equivalent (if available).
 */
export function toLeichteSprache(term: string): string {
  return leichteSprache[term] ?? term;
}
