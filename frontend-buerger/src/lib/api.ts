import { browser } from "$app/environment";

const API_URL = browser
  ? (window as any).__PUBLIC_API_URL || "http://localhost:3000"
  : process.env.PUBLIC_API_URL || "http://backend:3000";

const WS_URL = browser
  ? (window as any).__PUBLIC_WS_URL || "ws://localhost:3000"
  : "";

interface ApiResponse<T> {
  data: T;
  count?: number;
  message?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (\!response.ok) {
    const error = await response.json().catch(() => ({ message: "Netzwerkfehler" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// === Booking API ===

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailableDay {
  date: string;
  availableSlots: number;
}

export interface BookingResult {
  id: string;
  bookingCode: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  service: { name: string; durationMinutes: number };
  location: { name: string; address: string; city: string };
}

export interface ServiceInfo {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  durationMinutes: number;
  requiresDocuments: string[];
  fee?: number;
  category?: { name: string };
}

export function getAvailableDays(
  tenantSlug: string,
  serviceId: string,
  locationId: string,
  month: string
) {
  return request<AvailableDay[]>(
    `/api/v1/${tenantSlug}/booking/days?serviceId=${serviceId}&locationId=${locationId}&month=${month}`
  );
}

export function getAvailableSlots(
  tenantSlug: string,
  serviceId: string,
  locationId: string,
  date: string
) {
  return request<TimeSlot[]>(
    `/api/v1/${tenantSlug}/booking/slots?serviceId=${serviceId}&locationId=${locationId}&date=${date}`
  );
}

export function createBooking(
  tenantSlug: string,
  data: {
    serviceId: string;
    locationId: string;
    slotStart: string;
    citizenName: string;
    citizenEmail?: string;
    citizenPhone?: string;
    notes?: string;
  }
) {
  return request<BookingResult>(`/api/v1/${tenantSlug}/booking/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelBooking(
  tenantSlug: string,
  bookingCode: string,
  reason?: string
) {
  return request<{ success: boolean; message: string }>(
    `/api/v1/${tenantSlug}/booking/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ bookingCode, reason }),
    }
  );
}

export function lookupBooking(tenantSlug: string, bookingCode: string) {
  return request<BookingResult>(
    `/api/v1/${tenantSlug}/booking/lookup/${bookingCode}`
  );
}

// === Queue API ===

export interface QueueStatus {
  summary: {
    waiting: number;
    called: number;
    inService: number;
    completed: number;
    total: number;
  };
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    serviceName: string;
    counterName?: string;
    estimatedWaitMinutes?: number;
    issuedAt: string;
    calledAt?: string;
  }>;
}

export function getQueueStatus(tenantSlug: string, locationId: string) {
  return request<QueueStatus>(
    `/api/v1/${tenantSlug}/queue/status/${locationId}`
  );
}

export function issueQueueTicket(
  tenantSlug: string,
  serviceId: string,
  locationId: string,
  citizenName?: string
) {
  return request(`/api/v1/${tenantSlug}/queue/ticket`, {
    method: "POST",
    body: JSON.stringify({ serviceId, locationId, citizenName }),
  });
}

// === WebSocket ===

export function connectQueueWebSocket(
  tenantSlug: string,
  locationId: string,
  type: "queue" | "display" = "queue"
): WebSocket | null {
  if (\!browser) return null;

  const url = `${WS_URL}/api/v1/${tenantSlug}/queue/ws?locationId=${locationId}&type=${type}`;
  return new WebSocket(url);
}
