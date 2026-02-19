/**
 * aitema|Termin - Hardware Integration Service
 *
 * Provides integration with physical hardware:
 * - ESC/POS receipt printers (ticket printing)
 * - Queue display boards (WebSocket push)
 * - Audio announcements (TTS / gong config)
 * - Device health monitoring
 */
import { redisPub } from "../server.js";

// ============================================================
// ESC/POS Printer Commands
// ============================================================

/** ESC/POS control codes */
const ESC = "\x1B";
const GS = "\x1D";
const LF = "\x0A";
const ESCPOS = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT: `${GS}!\x10`,
  DOUBLE_WIDTH: `${GS}!\x20`,
  QUAD_SIZE: `${GS}!\x30`,
  NORMAL_SIZE: `${GS}!\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  CUT_PAPER: `${GS}V\x41\x03`,
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,
  LINE: "--------------------------------",
};

export interface TicketData {
  ticketNumber: string;
  serviceName: string;
  locationName: string;
  estimatedWaitMinutes: number;
  positionInQueue: number;
  issuedAt: Date;
  tenantName?: string;
  qrCodeData?: string;
}

/**
 * Generate ESC/POS byte commands for a queue ticket.
 * Compatible with Epson TM-T88, Star TSP100, and similar 80mm thermal printers.
 */
export function printTicket(ticket: TicketData): Buffer {
  const lines: string[] = [];
  const now = ticket.issuedAt;
  const dateStr = now.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Initialize printer
  lines.push(ESCPOS.INIT);

  // Header
  lines.push(ESCPOS.ALIGN_CENTER);
  lines.push(ESCPOS.BOLD_ON);
  lines.push(ESCPOS.DOUBLE_HEIGHT);
  lines.push(ticket.tenantName || "aitema|Termin");
  lines.push(LF);
  lines.push(ESCPOS.NORMAL_SIZE);
  lines.push(ESCPOS.BOLD_OFF);
  lines.push(ticket.locationName);
  lines.push(LF);
  lines.push(ESCPOS.LINE);
  lines.push(LF);

  // Ticket number (large)
  lines.push(ESCPOS.BOLD_ON);
  lines.push(ESCPOS.QUAD_SIZE);
  lines.push(ticket.ticketNumber);
  lines.push(LF);
  lines.push(ESCPOS.NORMAL_SIZE);
  lines.push(ESCPOS.BOLD_OFF);
  lines.push(LF);

  // Service
  lines.push(ESCPOS.LINE);
  lines.push(LF);
  lines.push(ESCPOS.ALIGN_LEFT);
  lines.push(ESCPOS.BOLD_ON);
  lines.push(`Dienstleistung:${LF}`);
  lines.push(ESCPOS.BOLD_OFF);
  lines.push(`  ${ticket.serviceName}${LF}`);
  lines.push(LF);

  // Wait info
  lines.push(ESCPOS.BOLD_ON);
  lines.push(`Geschaetzte Wartezeit:${LF}`);
  lines.push(ESCPOS.BOLD_OFF);
  const waitText =
    ticket.estimatedWaitMinutes <= 0
      ? "Sofort / Kein Warten"
      : `ca. ${ticket.estimatedWaitMinutes} Minuten`;
  lines.push(`  ${waitText}${LF}`);
  lines.push(LF);

  // Position
  lines.push(ESCPOS.BOLD_ON);
  lines.push(`Position in der Warteschlange:${LF}`);
  lines.push(ESCPOS.BOLD_OFF);
  lines.push(`  ${ticket.positionInQueue}${LF}`);
  lines.push(LF);

  // Date and time
  lines.push(ESCPOS.ALIGN_CENTER);
  lines.push(ESCPOS.LINE);
  lines.push(LF);
  lines.push(`Datum: ${dateStr}  Uhrzeit: ${timeStr}${LF}`);
  lines.push(LF);

  // QR code placeholder (GS ( k command for QR)
  if (ticket.qrCodeData) {
    const qrData = ticket.qrCodeData;
    const storeLen = qrData.length + 3;
    const pL = storeLen % 256;
    const pH = Math.floor(storeLen / 256);

    // QR Code: Model 2
    lines.push(`${GS}(k\x04\x001A2\x00`);
    // QR Code: Module size 6
    lines.push(`${GS}(k\x03\x001C\x06`);
    // QR Code: Error correction L
    lines.push(`${GS}(k\x03\x001E0`);
    // QR Code: Store data
    lines.push(
      `${GS}(k${String.fromCharCode(pL)}${String.fromCharCode(pH)}1P0${qrData}`
    );
    // QR Code: Print
    lines.push(`${GS}(k\x03\x001Q0`);
    lines.push(LF);
  }

  // Footer
  lines.push(ESCPOS.ALIGN_CENTER);
  lines.push("Bitte warten Sie, bis Ihre");
  lines.push(LF);
  lines.push("Nummer aufgerufen wird.");
  lines.push(LF);
  lines.push(LF);
  lines.push(ESCPOS.FEED_LINES(3));
  lines.push(ESCPOS.CUT_PAPER);

  return Buffer.from(lines.join(""), "latin1");
}

// ============================================================
// Display Trigger (WebSocket via Redis PubSub)
// ============================================================

export interface DisplayCallPayload {
  ticketNumber: string;
  counterName: string;
  serviceName: string;
  locationId: string;
  animation?: "slide" | "flash" | "fade";
  priority?: "normal" | "high";
}

/**
 * Trigger a ticket-called event on all display boards for a location.
 * Publishes via Redis PubSub so WebSocket handlers can forward to clients.
 */
export async function triggerDisplay(payload: DisplayCallPayload): Promise<void> {
  const message = {
    type: "TICKET_CALLED",
    data: {
      ticketNumber: payload.ticketNumber,
      counterName: payload.counterName,
      serviceName: payload.serviceName,
      animation: payload.animation || "slide",
      priority: payload.priority || "normal",
      timestamp: new Date().toISOString(),
    },
  };

  await redisPub.publish(
    `display:${payload.locationId}`,
    JSON.stringify(message)
  );
}

// ============================================================
// Audio Trigger
// ============================================================

export interface AudioConfig {
  type: "tts" | "gong" | "chime" | "none";
  ttsVoice?: string;
  ttsLang?: string;
  volume?: number; // 0.0 - 1.0
  gongFile?: string;
  announcementTemplate?: string; // e.g. "Nummer {ticket} bitte zu {counter}"
}

const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  type: "tts",
  ttsVoice: "de-DE-Standard-A",
  ttsLang: "de-DE",
  volume: 0.8,
  announcementTemplate: "Nummer {ticket}, bitte zu {counter}",
};

/**
 * Trigger an audio announcement on display boards.
 * The actual TTS synthesis happens client-side via Web Speech API.
 */
export async function triggerAudio(
  locationId: string,
  ticketNumber: string,
  counterName: string,
  config?: Partial<AudioConfig>
): Promise<void> {
  const audioConfig = { ...DEFAULT_AUDIO_CONFIG, ...config };

  let announcement = "";
  if (audioConfig.type === "tts" && audioConfig.announcementTemplate) {
    announcement = audioConfig.announcementTemplate
      .replace("{ticket}", ticketNumber)
      .replace("{counter}", counterName);
  }

  const message = {
    type: "AUDIO_ANNOUNCE",
    data: {
      audioType: audioConfig.type,
      announcement,
      voice: audioConfig.ttsVoice,
      lang: audioConfig.ttsLang,
      volume: audioConfig.volume,
      gongFile: audioConfig.gongFile,
      ticketNumber,
      counterName,
      timestamp: new Date().toISOString(),
    },
  };

  await redisPub.publish(
    `display:${locationId}`,
    JSON.stringify(message)
  );
}

// ============================================================
// Display Configuration
// ============================================================

export interface DisplayConfig {
  layout: "standard" | "split" | "fullscreen" | "minimal";
  theme: "dark" | "light" | "high-contrast";
  logoUrl?: string;
  backgroundUrl?: string;
  primaryColor: string;
  accentColor: string;
  showClock: boolean;
  showDate: boolean;
  showWeather: boolean;
  showRunningText: boolean;
  runningText?: string;
  maxCalledVisible: number;
  maxWaitingVisible: number;
  refreshIntervalMs: number;
  audio: AudioConfig;
}

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  layout: "standard",
  theme: "dark",
  primaryColor: "#1e3a5f",
  accentColor: "#fbbf24",
  showClock: true,
  showDate: true,
  showWeather: false,
  showRunningText: false,
  maxCalledVisible: 6,
  maxWaitingVisible: 12,
  refreshIntervalMs: 5000,
  audio: DEFAULT_AUDIO_CONFIG,
};

/**
 * Get display configuration for a location.
 * Falls back to defaults if no custom config exists.
 */
export async function getDisplayConfig(
  locationId: string
): Promise<DisplayConfig> {
  try {
    const { redis } = await import("../server.js");
    const cached = await redis.get(`display:config:${locationId}`);
    if (cached) {
      return { ...DEFAULT_DISPLAY_CONFIG, ...JSON.parse(cached) };
    }
  } catch {
    // Fall back to defaults
  }

  return { ...DEFAULT_DISPLAY_CONFIG };
}

/**
 * Save display configuration for a location.
 */
export async function saveDisplayConfig(
  locationId: string,
  config: Partial<DisplayConfig>
): Promise<DisplayConfig> {
  const { redis } = await import("../server.js");
  const merged = { ...DEFAULT_DISPLAY_CONFIG, ...config };
  await redis.set(
    `display:config:${locationId}`,
    JSON.stringify(merged),
    "EX",
    86400 * 365 // 1 year TTL
  );
  return merged;
}

// ============================================================
// Health Check
// ============================================================

export interface DeviceStatus {
  id: string;
  name: string;
  type: "printer" | "display" | "kiosk" | "audio";
  status: "online" | "offline" | "error" | "unknown";
  lastSeen?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Check the status of all hardware devices for a location.
 * Reads from Redis heartbeat data submitted by device agents.
 */
export async function healthCheck(locationId: string): Promise<{
  healthy: boolean;
  devices: DeviceStatus[];
  checkedAt: string;
}> {
  const { redis } = await import("../server.js");
  const deviceKeys = await redis.keys(`device:heartbeat:${locationId}:*`);
  const devices: DeviceStatus[] = [];
  const now = Date.now();
  const OFFLINE_THRESHOLD_MS = 60_000; // 1 minute

  for (const key of deviceKeys) {
    try {
      const raw = await redis.get(key);
      if (!raw) continue;

      const data = JSON.parse(raw);
      const lastSeenMs = new Date(data.lastSeen).getTime();
      const isOnline = now - lastSeenMs < OFFLINE_THRESHOLD_MS;

      devices.push({
        id: data.deviceId,
        name: data.name || data.deviceId,
        type: data.type || "unknown",
        status: data.error ? "error" : isOnline ? "online" : "offline",
        lastSeen: data.lastSeen,
        errorMessage: data.error,
        metadata: data.metadata,
      });
    } catch {
      // Skip malformed entries
    }
  }

  // Sort: errors first, then offline, then online
  const statusOrder = { error: 0, offline: 1, unknown: 2, online: 3 };
  devices.sort(
    (a, b) =>
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
  );

  const healthy =
    devices.length > 0 && devices.every((d) => d.status === "online");

  return {
    healthy,
    devices,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Register a device heartbeat (called by device agents).
 */
export async function registerDeviceHeartbeat(
  locationId: string,
  deviceId: string,
  deviceType: string,
  name: string,
  metadata?: Record<string, any>,
  error?: string
): Promise<void> {
  const { redis } = await import("../server.js");
  const key = `device:heartbeat:${locationId}:${deviceId}`;
  const data = {
    deviceId,
    name,
    type: deviceType,
    lastSeen: new Date().toISOString(),
    metadata,
    error,
  };
  await redis.set(key, JSON.stringify(data), "EX", 300); // 5 min TTL
}
