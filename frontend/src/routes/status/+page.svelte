<!--
  aitema|Termin - Termin-Status-Seite für Bürger
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { requestNotificationPermission, showPushNotification, getNotificationStatus } from "$lib/notifications";

  let bookingRef = "";
  // M2: No-Show Push Notification State
  let ws: WebSocket | null = null;
  let notificationStatus: string = "default";
  let calledNotification: string | null = null;
  let appointment: AppointmentStatus | null = null;
  let loading = false;
  let error = "";
  let showCancelConfirm = false;
  let cancelling = false;
  let cancelSuccess = false;

  const API_BASE = import.meta.env.VITE_API_URL || "";

  const STATUS_MAP: Record<string, StatusInfo> = {
    BOOKED: {
      label: "Gebucht",
      badgeClass: "badge-blue",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      description: "Ihr Termin ist gebucht. Sie erhalten eine Bestätigung per E-Mail.",
      bannerColor: "#dbeafe",
      bannerText: "#1e40af",
      canCancel: true,
    },
    CONFIRMED: {
      label: "Bestätigt",
      badgeClass: "badge-green",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      description: "Ihr Termin ist bestätigt. Bitte erscheinen Sie pünktlich.",
      bannerColor: "#dcfce7",
      bannerText: "#166534",
      canCancel: true,
    },
    CHECKED_IN: {
      label: "Eingecheckt",
      badgeClass: "badge-amber",
      icon: "M5 13l4 4L19 7",
      description: "Sie sind eingecheckt. Bitte warten Sie auf Ihren Aufruf.",
      bannerColor: "#fef3c7",
      bannerText: "#92400e",
      canCancel: false,
    },
    IN_PROGRESS: {
      label: "In Bearbeitung",
      badgeClass: "badge-blue",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      description: "Ihr Anliegen wird gerade bearbeitet.",
      bannerColor: "#e0f2fe",
      bannerText: "#0369a1",
      canCancel: false,
    },
    COMPLETED: {
      label: "Abgeschlossen",
      badgeClass: "badge-slate",
      icon: "M5 13l4 4L19 7",
      description: "Ihr Termin wurde erfolgreich abgeschlossen.",
      bannerColor: "#f1f5f9",
      bannerText: "#475569",
      canCancel: false,
    },
    CANCELLED: {
      label: "Storniert",
      badgeClass: "badge-red",
      icon: "M6 18L18 6M6 6l12 12",
      description: "Dieser Termin wurde storniert.",
      bannerColor: "#fee2e2",
      bannerText: "#991b1b",
      canCancel: false,
    },
    NO_SHOW: {
      label: "Nicht erschienen",
      badgeClass: "badge-red",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
      description: "Sie sind leider nicht zum Termin erschienen.",
      bannerColor: "#fee2e2",
      bannerText: "#991b1b",
      canCancel: false,
    },
  };

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      bookingRef = ref;
      await lookupAppointment();
    }
    // M2: Benachrichtigungs-Status initialisieren
    if (typeof window !== "undefined") {
      notificationStatus = getNotificationStatus();
    }
  });

  onDestroy(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  // M2: WebSocket fuer Wartenummer-Updates aufbauen (nur wenn Status == CHECKED_IN oder WAITING)
  function setupCitizenWebSocket(ticketNumber: string) {
    if (ws) {
      ws.close();
      ws = null;
    }
    const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^https?:/, wsProto)
      : `${wsProto}//${location.host}`;
    const wsUrl = `${wsBase}/api/v1/default/queue/ws/citizen/${encodeURIComponent(ticketNumber)}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Citizen WebSocket verbunden fuer Ticket:", ticketNumber);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "TICKET_CALLED") {
          calledNotification = data.message || "Ihre Nummer wird aufgerufen!";
          showPushNotification(
            "Ihre Wartenummer wird aufgerufen!",
            data.message || `Bitte begeben Sie sich zu ${data.counterName || "Ihrem Schalter"}.`
          );
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("Citizen WebSocket Fehler (Fallback auf Polling):", err);
    };

    ws.onclose = () => {
      console.log("Citizen WebSocket getrennt");
    };
  }

  // M2: Browser-Benachrichtigung anfordern
  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    notificationStatus = getNotificationStatus();
    if (granted) {
      console.log("Browser-Benachrichtigungen aktiviert");
    }
  }

  async function lookupAppointment() {
    if (!bookingRef.trim()) {
      error = "Bitte geben Sie eine Buchungsnummer ein.";
      return;
    }
    loading = true;
    error = "";
    appointment = null;
    cancelSuccess = false;
    try {
      const res = await fetch(
        API_BASE + "/api/v1/appointments/" + encodeURIComponent(bookingRef.trim()) + "/status"
      );
      if (!res.ok) {
        error = res.status === 404
          ? "Kein Termin mit dieser Buchungsnummer gefunden."
          : "Fehler beim Abrufen des Status. Bitte versuchen Sie es später erneut.";
        return;
      }
      appointment = await res.json();
      // M2: WebSocket aufbauen fuer Echtzeit-Aufrufsbenachrichtigung
      if (appointment && appointment.bookingRef &&
          ['CHECKED_IN', 'CONFIRMED', 'BOOKED'].includes(appointment.status)) {
        setupCitizenWebSocket(appointment.bookingRef);
      }
    } catch {
      error = "Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.";
    } finally {
      loading = false;
    }
  }

  async function cancelAppointment() {
    if (!appointment) return;
    cancelling = true;
    try {
      const res = await fetch(
        API_BASE + "/api/v1/appointments/" + encodeURIComponent(appointment.bookingRef) + "/cancel",
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        error = data.error || "Stornierung fehlgeschlagen.";
        return;
      }
      cancelSuccess = true;
      appointment.status = "CANCELLED";
      showCancelConfirm = false;
    } catch {
      error = "Verbindungsfehler bei der Stornierung.";
    } finally {
      cancelling = false;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }
  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  function getQRCodeUrl(ref: string): string {
    return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(ref);
  }

  interface AppointmentStatus {
    bookingRef: string;
    status: string;
    serviceName: string;
    locationName: string;
    locationAddress: string;
    date: string;
    startTime: string;
    endTime: string;
    citizenName: string;
    requiredDocs?: string[];
  }
  interface StatusInfo {
    label: string;
    badgeClass: string;
    icon: string;
    description: string;
    bannerColor: string;
    bannerText: string;
    canCancel: boolean;
  }
</script>

<svelte:head>
  <title>Termin-Status | aitema|Termin</title>
</svelte:head>

<div class="status-page">
  <!-- Page Header -->
  <div class="status-hero">
    <div class="container">
      <h1 class="status-hero-title">Termin-Status abfragen</h1>
      <p class="status-hero-sub">
        Geben Sie Ihre Buchungsnummer ein, um den aktuellen Status Ihres Termins zu sehen.
      </p>
    </div>
  </div>

  <div class="container status-container">
    <!-- Search Form -->
    <div class="card search-card">
      <div class="card-body">
        <form on:submit|preventDefault={lookupAppointment} class="search-form" novalidate>
          <div class="form-group" style="margin-bottom: 0; flex: 1;">
            <label for="bookingRef" class="form-label">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="#3b82f6" stroke-width="1.3"/>
                <path d="M4 1v4M10 1v4M1 6h12" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Buchungsnummer
            </label>
            <input
              id="bookingRef"
              type="text"
              bind:value={bookingRef}
              placeholder="TRM-2026-00001"
              class="form-input search-input"
              aria-describedby={error ? 'search-error' : undefined}
            />
          </div>
          <button type="submit" disabled={loading} class="btn btn-primary search-btn" aria-busy={loading}>
            {#if loading}
              <div class="spinner spinner-sm spinner-white"></div>
              Suche...
            {:else}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="5" stroke="white" stroke-width="1.5"/>
                <path d="M10.5 10.5l3 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Abfragen
            {/if}
          </button>
        </form>

        {#if error}
          <div id="search-error" class="alert alert-error" style="margin-top: 1rem;" role="alert">
            <svg class="alert-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="#dc2626" stroke-width="1.3"/>
              <path d="M8 5v3M8 10h.01" stroke="#dc2626" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            {error}
          </div>
        {/if}
      </div>
    </div>

    <!-- Cancel Success -->
    {#if cancelSuccess}
      <div class="alert alert-success" role="status">
        <svg class="alert-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="7.5" stroke="#059669" stroke-width="1.5"/>
          <path d="M5.5 9l2.5 2.5 5-5" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Ihr Termin wurde erfolgreich storniert.
      </div>
    {/if}

    <!-- M2: No-Show Push Notification Banners -->
    {#if calledNotification}
      <div class="notification-called" role="alert" aria-live="assertive">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <div>
          <strong>Sie werden aufgerufen!</strong>
          <p>{calledNotification}</p>
        </div>
        <button class="notif-close" on:click={() => calledNotification = null} aria-label="Schliessen">x</button>
      </div>
    {/if}

    {#if notificationStatus === "default" && appointment && ["CHECKED_IN", "CONFIRMED", "BOOKED"].includes(appointment.status)}
      <div class="notification-prompt" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p>Aktivieren Sie Browser-Benachrichtigungen, um sofort informiert zu werden wenn Sie aufgerufen werden.</p>
        <button class="btn btn-sm btn-primary" on:click={enableNotifications}>
          Benachrichtigungen aktivieren
        </button>
      </div>
    {/if}

    <!-- Appointment Details -->
    {#if appointment}
      {@const statusInfo = STATUS_MAP[appointment.status] || STATUS_MAP.BOOKED}
      <div class="card appt-card">
        <!-- Status Banner -->
        <div class="status-banner" style="background: {statusInfo.bannerColor}; color: {statusInfo.bannerText};">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d={statusInfo.icon}/>
          </svg>
          <div>
            <p class="status-banner-label">{statusInfo.label}</p>
            <p class="status-banner-desc">{statusInfo.description}</p>
          </div>
          <span class="badge {statusInfo.badgeClass}" style="margin-left: auto; flex-shrink: 0;">{statusInfo.label}</span>
        </div>

        <!-- Details Grid -->
        <div class="card-body appt-grid">
          <!-- Left: Appointment Info -->
          <div class="appt-info">
            <div class="detail-group">
              <p class="detail-key">Buchungsnummer</p>
              <p class="detail-val mono">{appointment.bookingRef}</p>
            </div>
            <div class="detail-group">
              <p class="detail-key">Dienstleistung</p>
              <p class="detail-val">{appointment.serviceName}</p>
            </div>
            <div class="detail-group">
              <p class="detail-key">Datum &amp; Uhrzeit</p>
              <p class="detail-val">{formatDate(appointment.startTime)}</p>
              <p class="detail-val-sub">{formatTime(appointment.startTime)} – {formatTime(appointment.endTime)} Uhr</p>
            </div>
            <div class="detail-group">
              <p class="detail-key">Standort</p>
              <p class="detail-val">{appointment.locationName}</p>
              <p class="detail-val-sub">{appointment.locationAddress}</p>
            </div>
          </div>

          <!-- Right: QR Code -->
          <div class="appt-qr">
            {#if appointment.status === 'BOOKED' || appointment.status === 'CONFIRMED'}
              <div class="qr-wrapper">
                <p class="qr-label">QR-Code für Check-in</p>
                <img
                  src={getQRCodeUrl(appointment.bookingRef)}
                  alt="QR-Code für Check-in am Empfangsterminal"
                  width="160" height="160"
                  class="qr-img"
                  loading="lazy"
                />
                <p class="qr-hint">Am Empfangsterminal scannen</p>
              </div>
            {:else}
              <div class="qr-unavailable">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <circle cx="24" cy="24" r="20" fill="#f1f5f9"/>
                  <rect x="14" y="14" width="8" height="8" rx="1.5" stroke="#94a3b8" stroke-width="1.5"/>
                  <rect x="26" y="14" width="8" height="8" rx="1.5" stroke="#94a3b8" stroke-width="1.5"/>
                  <rect x="14" y="26" width="8" height="8" rx="1.5" stroke="#94a3b8" stroke-width="1.5"/>
                  <path d="M26 30h8M30 26v8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <p class="qr-unavailable-text">QR-Code nicht verfügbar</p>
              </div>
            {/if}
          </div>
        </div>

        <!-- Required Docs -->
        {#if appointment.requiredDocs && appointment.requiredDocs.length > 0}
          <div class="docs-section">
            <div class="alert alert-warning">
              <svg class="alert-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 2L1.5 15h15L9 2z" stroke="#d97706" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M9 7v4M9 13h.01" stroke="#d97706" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <div>
                <strong>Benötigte Unterlagen</strong>
                <ul class="docs-list">
                  {#each appointment.requiredDocs as doc}
                    <li>{doc}</li>
                  {/each}
                </ul>
              </div>
            </div>
          </div>
        {/if}

        <!-- Next Steps -->
        <div class="next-steps-section">
          <div class="alert alert-info">
            <svg class="alert-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="7.5" stroke="#3b82f6" stroke-width="1.5"/>
              <path d="M9 8v5M9 5h.01" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div>
              <strong>Nächste Schritte</strong>
              {#if appointment.status === 'BOOKED' || appointment.status === 'CONFIRMED'}
                <ol class="next-steps-list">
                  <li>Bringen Sie alle benötigten Unterlagen mit</li>
                  <li>Erscheinen Sie 5 Minuten vor Ihrem Termin</li>
                  <li>Checken Sie am Empfangsterminal mit Ihrem QR-Code ein</li>
                  <li>Warten Sie auf den Aufruf an Ihrem Schalter</li>
                </ol>
              {:else if appointment.status === 'CHECKED_IN'}
                <p>Bitte nehmen Sie im Wartebereich Platz. Sie werden aufgerufen, sobald ein Schalter frei ist.</p>
              {:else if appointment.status === 'COMPLETED'}
                <p>Vielen Dank für Ihren Besuch. Bei Fragen wenden Sie sich bitte an den Bürgerservice.</p>
              {:else if appointment.status === 'CANCELLED'}
                <p>Sie können jederzeit einen neuen Termin buchen.</p>
              {/if}
            </div>
          </div>
        </div>

        <!-- Cancel Button -->
        {#if statusInfo.canCancel}
          <div class="cancel-section">
            {#if showCancelConfirm}
              <div class="cancel-confirm">
                <p>Möchten Sie diesen Termin wirklich stornieren?</p>
                <div class="cancel-actions">
                  <button on:click={cancelAppointment} disabled={cancelling} class="btn btn-danger btn-sm">
                    {cancelling ? 'Wird storniert...' : 'Ja, stornieren'}
                  </button>
                  <button on:click={() => showCancelConfirm = false} class="btn btn-secondary btn-sm">
                    Abbrechen
                  </button>
                </div>
              </div>
            {:else}
              <button on:click={() => showCancelConfirm = true} class="cancel-link">
                Termin stornieren
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Empty State -->
    {#if !appointment && !loading && !error}
      <div class="card empty-card">
        <div class="card-body empty-body">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="#f1f5f9"/>
              <circle cx="22" cy="22" r="9" stroke="#94a3b8" stroke-width="2"/>
              <path d="M29 29l6 6" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 class="empty-title">Terminstatus abfragen</h2>
          <p class="empty-desc">
            Geben Sie oben Ihre Buchungsnummer ein (z.B. TRM-2026-00001),
            um den aktuellen Status Ihres Termins zu sehen.
          </p>
          <p class="empty-hint">
            Die Buchungsnummer finden Sie in Ihrer Bestätigungs-E-Mail.
          </p>
        </div>
      </div>
    {/if}

    <!-- Loading State -->
    {#if loading && !appointment}
      <div class="loading-state" role="status">
        <div class="spinner"></div>
        <p>Termin wird gesucht...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .status-page { min-height: calc(100vh - 200px); }

  /* Hero */
  .status-hero {
    background: linear-gradient(135deg, var(--aitema-navy) 0%, var(--aitema-blue) 100%);
    padding: 2.5rem 1.5rem;
    margin-bottom: 0;
  }
  .status-hero-title {
    font-size: 1.75rem; font-weight: 800;
    color: #fff; margin-bottom: 0.375rem;
    letter-spacing: -0.025em;
  }
  .status-hero-sub { font-size: 0.9375rem; color: rgba(255,255,255,0.7); margin: 0; }

  /* Container */
  .status-container { padding-top: 2rem; padding-bottom: 4rem; max-width: 860px; }

  /* Search */
  .search-card { margin-bottom: 1.5rem; }
  .search-form { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
  .search-input { font-family: monospace; font-size: 1rem; }
  .search-btn { min-height: 46px; min-width: 130px; flex-shrink: 0; margin-top: auto; }

  /* Status Banner */
  .status-banner {
    padding: 1.25rem 1.5rem;
    display: flex; align-items: flex-start; gap: 1rem;
    border-radius: 0.75rem 0.75rem 0 0;
  }
  .status-banner-label { font-weight: 700; font-size: 1rem; margin-bottom: 0.125rem; }
  .status-banner-desc { font-size: 0.875rem; opacity: 0.85; margin: 0; }

  /* Appointment Grid */
  .appt-card { margin-bottom: 1.5rem; }
  .appt-grid { display: grid; grid-template-columns: 1fr 200px; gap: 2rem; }
  .appt-info { display: flex; flex-direction: column; gap: 1.25rem; }

  .detail-group {}
  .detail-key {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--aitema-muted); margin-bottom: 0.25rem;
  }
  .detail-val { font-size: 0.9375rem; font-weight: 600; color: var(--aitema-navy); margin: 0; }
  .detail-val.mono { font-family: monospace; font-size: 1.125rem; letter-spacing: 0.05em; }
  .detail-val-sub { font-size: 0.875rem; color: var(--aitema-muted); margin: 0.125rem 0 0; }

  /* QR */
  .appt-qr { display: flex; align-items: flex-start; justify-content: center; }
  .qr-wrapper { text-align: center; }
  .qr-label {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--aitema-muted); margin-bottom: 0.75rem;
  }
  .qr-img { border-radius: 0.75rem; border: 2px solid var(--aitema-slate-200); display: block; }
  .qr-hint { font-size: 0.75rem; color: var(--aitema-muted); margin-top: 0.5rem; }
  .qr-unavailable {
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    padding: 1rem; opacity: 0.6;
  }
  .qr-unavailable-text { font-size: 0.75rem; color: var(--aitema-muted); text-align: center; }

  /* Sections */
  .docs-section, .next-steps-section { padding: 0 1.5rem 1.25rem; }
  .docs-list { margin: 0.375rem 0 0 1.25rem; font-size: 0.875rem; }
  .docs-list li { margin-bottom: 0.25rem; }
  .next-steps-list { margin: 0.375rem 0 0 1.25rem; font-size: 0.875rem; }
  .next-steps-list li { margin-bottom: 0.375rem; }

  /* Cancel */
  .cancel-section { padding: 0 1.5rem 1.5rem; border-top: 1px solid var(--aitema-slate-100); padding-top: 1.25rem; margin-top: 0.25rem; }
  .cancel-confirm {
    background: #fef2f2; border: 1px solid #fca5a5;
    border-radius: 0.5rem; padding: 1rem 1.25rem;
  }
  .cancel-confirm p { color: #991b1b; font-weight: 600; font-size: 0.9375rem; margin-bottom: 0.75rem; }
  .cancel-actions { display: flex; gap: 0.75rem; }
  .cancel-link {
    background: none; border: none; cursor: pointer;
    color: var(--aitema-red); font-size: 0.875rem; font-weight: 600;
    padding: 0; text-decoration: underline; transition: color 150ms;
  }
  .cancel-link:hover { color: #b91c1c; }

  /* Empty State */
  .empty-card { margin-bottom: 1.5rem; }
  .empty-body { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3rem 2rem; }
  .empty-icon { margin-bottom: 1.25rem; }
  .empty-title { font-size: 1.125rem; font-weight: 700; color: var(--aitema-navy); margin-bottom: 0.5rem; }
  .empty-desc { font-size: 0.9375rem; color: var(--aitema-muted); max-width: 420px; margin-bottom: 0.5rem; }
  .empty-hint { font-size: 0.8125rem; color: var(--aitema-slate-300); }

  /* Loading */
  .loading-state {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding: 3rem; color: var(--aitema-muted);
  }

  /* Spinner */
  .spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2.5px solid var(--aitema-slate-200);
    border-top-color: var(--aitema-accent);
    animation: spin 0.7s linear infinite;
  }
  .spinner-sm { width: 16px; height: 16px; border-width: 2px; }
  .spinner-white { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Responsive */
  @media (max-width: 680px) {
    .search-form { flex-direction: column; }
    .search-btn { width: 100%; }
    .appt-grid { grid-template-columns: 1fr; }
    .appt-qr { justify-content: flex-start; }
    .status-banner { flex-wrap: wrap; }
  }

  /* M2: Notification Banners */
  .notification-called {
    display: flex; align-items: flex-start; gap: 0.75rem;
    background: #dcfce7; border: 2px solid #16a34a; border-radius: 10px;
    padding: 1rem 1.25rem; margin-bottom: 1rem; position: relative;
    animation: pulse-green 2s ease-in-out infinite;
  }
  .notification-called strong { color: #15803d; font-size: 1rem; display: block; }
  .notification-called p { color: #166534; margin: 0.25rem 0 0; font-size: 0.875rem; }
  .notification-called svg { color: #16a34a; flex-shrink: 0; margin-top: 2px; }
  .notif-close {
    position: absolute; top: 0.5rem; right: 0.75rem;
    background: none; border: none; cursor: pointer;
    color: #15803d; font-size: 1rem; padding: 0.25rem 0.5rem;
  }
  .notification-prompt {
    display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    padding: 0.875rem 1rem; margin-bottom: 1rem;
  }
  .notification-prompt p { flex: 1; margin: 0; font-size: 0.875rem; color: #1d4ed8; }
  .notification-prompt svg { color: #3b82f6; flex-shrink: 0; }
  .btn-sm { padding: 0.375rem 0.875rem; font-size: 0.8125rem; }
  @keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
    50% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
  }
</style>
