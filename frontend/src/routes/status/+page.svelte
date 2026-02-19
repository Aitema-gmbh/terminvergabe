<!--
  aitema|Termin - Termin-Status-Seite fuer Buerger

  Features:
  - Buchungsnummer eingeben
  - Status anzeigen (gebucht, bestaetigt, eingecheckt, etc.)
  - QR-Code fuer Check-in
  - Stornieren-Button
  - Naechste Schritte Info
-->
<script lang="ts">
  import { onMount } from "svelte";

  // State
  let bookingRef = "";
  let appointment: AppointmentStatus | null = null;
  let loading = false;
  let error = "";
  let showCancelConfirm = false;
  let cancelling = false;
  let cancelSuccess = false;

  // API Base URL
  const API_BASE = import.meta.env.VITE_API_URL || "";

  // Status-Mapping
  const STATUS_MAP: Record<string, StatusInfo> = {
    BOOKED: {
      label: "Gebucht",
      color: "bg-blue-100 text-blue-800",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      description: "Ihr Termin ist gebucht. Sie erhalten eine Bestaetigung per E-Mail.",
      canCancel: true,
    },
    CONFIRMED: {
      label: "Bestaetigt",
      color: "bg-green-100 text-green-800",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      description: "Ihr Termin ist bestaetigt. Bitte erscheinen Sie puenktlich.",
      canCancel: true,
    },
    CHECKED_IN: {
      label: "Eingecheckt",
      color: "bg-yellow-100 text-yellow-800",
      icon: "M5 13l4 4L19 7",
      description: "Sie sind eingecheckt. Bitte warten Sie auf Ihren Aufruf.",
      canCancel: false,
    },
    IN_PROGRESS: {
      label: "In Bearbeitung",
      color: "bg-purple-100 text-purple-800",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      description: "Ihr Anliegen wird gerade bearbeitet.",
      canCancel: false,
    },
    COMPLETED: {
      label: "Abgeschlossen",
      color: "bg-gray-100 text-gray-800",
      icon: "M5 13l4 4L19 7",
      description: "Ihr Termin wurde erfolgreich abgeschlossen.",
      canCancel: false,
    },
    CANCELLED: {
      label: "Storniert",
      color: "bg-red-100 text-red-800",
      icon: "M6 18L18 6M6 6l12 12",
      description: "Dieser Termin wurde storniert.",
      canCancel: false,
    },
    NO_SHOW: {
      label: "Nicht erschienen",
      color: "bg-red-100 text-red-600",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
      description: "Sie sind leider nicht zum Termin erschienen.",
      canCancel: false,
    },
  };

  // Aus URL-Parameter laden
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      bookingRef = ref;
      lookupAppointment();
    }
  });

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
        if (res.status === 404) {
          error = "Kein Termin mit dieser Buchungsnummer gefunden.";
        } else {
          error = "Fehler beim Abrufen des Status. Bitte versuchen Sie es spaeter erneut.";
        }
        return;
      }

      appointment = await res.json();
    } catch (e) {
      error = "Verbindungsfehler. Bitte pruefen Sie Ihre Internetverbindung.";
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
    } catch (e) {
      error = "Verbindungsfehler bei der Stornierung.";
    } finally {
      cancelling = false;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getQRCodeUrl(ref: string): string {
    return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(ref);
  }

  // Types
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
    color: string;
    icon: string;
    description: string;
    canCancel: boolean;
  }
</script>

<svelte:head>
  <title>Termin-Status | aitema|Termin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-[#1e3a5f] text-white shadow">
    <div class="max-w-3xl mx-auto px-4 py-6">
      <h1 class="text-2xl font-bold">Termin-Status abfragen</h1>
      <p class="mt-1 text-blue-200">
        Geben Sie Ihre Buchungsnummer ein, um den Status Ihres Termins abzufragen.
      </p>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-8">
    <!-- Suchformular -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <form on:submit|preventDefault={lookupAppointment} class="flex gap-3">
        <div class="flex-1">
          <label for="bookingRef" class="block text-sm font-medium text-gray-700 mb-1">
            Buchungsnummer
          </label>
          <input
            id="bookingRef"
            type="text"
            bind:value={bookingRef}
            placeholder="TRM-2026-00001"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
          />
        </div>
        <div class="flex items-end">
          <button
            type="submit"
            disabled={loading}
            class="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7f] disabled:opacity-50 transition font-medium"
          >
            {#if loading}
              <svg class="animate-spin h-5 w-5 inline mr-1" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75" />
              </svg>
            {/if}
            Abfragen
          </button>
        </div>
      </form>

      {#if error}
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      {/if}
    </div>

    <!-- Stornierung erfolgreich -->
    {#if cancelSuccess}
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p class="text-green-800 font-medium">
          Ihr Termin wurde erfolgreich storniert.
        </p>
      </div>
    {/if}

    <!-- Termin-Details -->
    {#if appointment}
      {@const statusInfo = STATUS_MAP[appointment.status] || STATUS_MAP.BOOKED}

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <!-- Status-Banner -->
        <div class="p-4 {statusInfo.color} flex items-center gap-3">
          <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d={statusInfo.icon} />
          </svg>
          <div>
            <p class="font-semibold text-lg">{statusInfo.label}</p>
            <p class="text-sm opacity-80">{statusInfo.description}</p>
          </div>
        </div>

        <!-- Details -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Linke Spalte: Termininfos -->
            <div class="space-y-4">
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Buchungsnummer</p>
                <p class="text-lg font-mono font-bold">{appointment.bookingRef}</p>
              </div>

              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Dienstleistung</p>
                <p class="text-base font-medium">{appointment.serviceName}</p>
              </div>

              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Datum und Uhrzeit</p>
                <p class="text-base font-medium">
                  {formatDate(appointment.startTime)}
                </p>
                <p class="text-base">
                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)} Uhr
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Standort</p>
                <p class="text-base font-medium">{appointment.locationName}</p>
                <p class="text-sm text-gray-600">{appointment.locationAddress}</p>
              </div>
            </div>

            <!-- Rechte Spalte: QR-Code -->
            <div class="flex flex-col items-center justify-center">
              {#if appointment.status === "BOOKED" || appointment.status === "CONFIRMED"}
                <div class="text-center">
                  <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    QR-Code fuer Check-in
                  </p>
                  <img
                    src={getQRCodeUrl(appointment.bookingRef)}
                    alt="QR-Code fuer Check-in"
                    class="w-48 h-48 border rounded-lg shadow-sm"
                  />
                  <p class="text-xs text-gray-500 mt-2">
                    Zeigen Sie diesen QR-Code am Terminal vor Ort
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Benoetigte Unterlagen -->
          {#if appointment.requiredDocs && appointment.requiredDocs.length > 0}
            <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 class="font-semibold text-amber-800 mb-2">Benoetigte Unterlagen</h3>
              <ul class="list-disc list-inside text-sm text-amber-700 space-y-1">
                {#each appointment.requiredDocs as doc}
                  <li>{doc}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Naechste Schritte -->
          <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 class="font-semibold text-blue-800 mb-2">Naechste Schritte</h3>
            {#if appointment.status === "BOOKED" || appointment.status === "CONFIRMED"}
              <ol class="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Bringen Sie alle benoetigten Unterlagen mit</li>
                <li>Erscheinen Sie 5 Minuten vor Ihrem Termin</li>
                <li>Checken Sie am Empfangsterminal mit Ihrem QR-Code oder Ihrer Buchungsnummer ein</li>
                <li>Warten Sie auf den Aufruf an Ihrem Schalter</li>
              </ol>
            {:else if appointment.status === "CHECKED_IN"}
              <p class="text-sm text-blue-700">
                Bitte nehmen Sie im Wartebereich Platz. Sie werden aufgerufen, sobald ein Schalter frei ist.
              </p>
            {:else if appointment.status === "COMPLETED"}
              <p class="text-sm text-blue-700">
                Vielen Dank fuer Ihren Besuch. Bei Fragen wenden Sie sich bitte an den Buergerservice.
              </p>
            {:else if appointment.status === "CANCELLED"}
              <p class="text-sm text-blue-700">
                Sie koennen jederzeit einen neuen Termin buchen.
              </p>
            {/if}
          </div>

          <!-- Stornieren-Button -->
          {#if statusInfo.canCancel && appointment.status !== "CANCELLED"}
            <div class="mt-6 border-t pt-4">
              {#if showCancelConfirm}
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p class="text-red-800 font-medium mb-3">
                    Moechten Sie diesen Termin wirklich stornieren?
                  </p>
                  <div class="flex gap-3">
                    <button
                      on:click={cancelAppointment}
                      disabled={cancelling}
                      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium"
                    >
                      {#if cancelling}Wird storniert...{:else}Ja, Termin stornieren{/if}
                    </button>
                    <button
                      on:click={() => (showCancelConfirm = false)}
                      class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              {:else}
                <button
                  on:click={() => (showCancelConfirm = true)}
                  class="text-red-600 hover:text-red-800 text-sm font-medium transition"
                >
                  Termin stornieren
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Info-Box wenn kein Termin geladen -->
    {#if !appointment && !loading && !error}
      <div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p class="text-lg font-medium text-gray-600">Terminstatus abfragen</p>
        <p class="mt-2 text-sm">
          Geben Sie oben Ihre Buchungsnummer ein (z.B. TRM-2026-00001),
          um den aktuellen Status Ihres Termins zu sehen.
        </p>
        <p class="mt-2 text-xs text-gray-400">
          Die Buchungsnummer finden Sie in Ihrer Bestaetigungs-E-Mail.
        </p>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
    <p>aitema|Termin - Digitale Terminvergabe fuer Kommunen</p>
  </footer>
</div>
