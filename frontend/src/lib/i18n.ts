/**
 * aitema|Termin - Internationalization (i18n) Service
 *
 * Mehrsprachigkeits-Service mit typ-sicheren Translation Keys.
 * Unterstützte Sprachen: de (Standard), en, tr, ar
 * RTL-Support für Arabisch.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = "de" | "en" | "tr" | "ar";

export interface TranslationKeys {
  // Navigation
  "nav.bookAppointment": string;
  "nav.queueNumber": string;
  "nav.myAppointment": string;

  // Booking Steps
  "booking.selectLocation": string;
  "booking.selectService": string;
  "booking.selectDate": string;
  "booking.yourData": string;
  "booking.confirmation": string;

  // Queue
  "queue.yourNumber": string;
  "queue.estimatedWait": string;
  "queue.minutes": string;
  "queue.position": string;
  "queue.nowServing": string;

  // Status
  "status.booked": string;
  "status.confirmed": string;
  "status.checkedIn": string;
  "status.called": string;
  "status.cancelled": string;
  "status.completed": string;
  "status.noShow": string;

  // Forms
  "form.firstName": string;
  "form.lastName": string;
  "form.email": string;
  "form.phone": string;
  "form.notes": string;
  "form.required": string;

  // Buttons
  "btn.book": string;
  "btn.cancel": string;
  "btn.checkIn": string;
  "btn.next": string;
  "btn.back": string;
  "btn.confirm": string;
  "btn.download": string;
  "btn.print": string;

  // Errors
  "error.slotUnavailable": string;
  "error.bookingFailed": string;
  "error.notFound": string;
  "error.networkError": string;
  "error.invalidInput": string;

  // Accessibility
  "a11y.skipToMain": string;
  "a11y.newTab": string;
  "a11y.loading": string;
  "a11y.close": string;
}

export type TranslationKey = keyof TranslationKeys;

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const translations: Record<Locale, TranslationKeys> = {
  de: {
    "nav.bookAppointment": "Termin buchen",
    "nav.queueNumber": "Wartenummer",
    "nav.myAppointment": "Mein Termin",

    "booking.selectLocation": "Standort wählen",
    "booking.selectService": "Dienstleistung",
    "booking.selectDate": "Termin wählen",
    "booking.yourData": "Ihre Daten",
    "booking.confirmation": "Bestätigung",

    "queue.yourNumber": "Ihre Wartenummer",
    "queue.estimatedWait": "Geschätzte Wartezeit",
    "queue.minutes": "Minuten",
    "queue.position": "Position in der Warteschlange",
    "queue.nowServing": "Wird gerade aufgerufen",

    "status.booked": "Gebucht",
    "status.confirmed": "Bestätigt",
    "status.checkedIn": "Eingecheckt",
    "status.called": "Aufgerufen",
    "status.cancelled": "Storniert",
    "status.completed": "Abgeschlossen",
    "status.noShow": "Nicht erschienen",

    "form.firstName": "Vorname",
    "form.lastName": "Nachname",
    "form.email": "E-Mail",
    "form.phone": "Telefon",
    "form.notes": "Anmerkungen",
    "form.required": "Pflichtfeld",

    "btn.book": "Buchen",
    "btn.cancel": "Stornieren",
    "btn.checkIn": "Einchecken",
    "btn.next": "Weiter",
    "btn.back": "Zurück",
    "btn.confirm": "Bestätigen",
    "btn.download": "Herunterladen",
    "btn.print": "Drucken",

    "error.slotUnavailable": "Dieser Termin ist leider nicht mehr verfügbar.",
    "error.bookingFailed": "Die Buchung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    "error.notFound": "Der gewünschte Eintrag wurde nicht gefunden.",
    "error.networkError": "Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.",
    "error.invalidInput": "Bitte überprüfen Sie Ihre Eingaben.",

    "a11y.skipToMain": "Zum Hauptinhalt springen",
    "a11y.newTab": "Öffnet in neuem Tab",
    "a11y.loading": "Wird geladen…",
    "a11y.close": "Schließen",
  },

  en: {
    "nav.bookAppointment": "Book Appointment",
    "nav.queueNumber": "Queue Number",
    "nav.myAppointment": "My Appointment",

    "booking.selectLocation": "Select Location",
    "booking.selectService": "Select Service",
    "booking.selectDate": "Select Date",
    "booking.yourData": "Your Details",
    "booking.confirmation": "Confirmation",

    "queue.yourNumber": "Your Queue Number",
    "queue.estimatedWait": "Estimated Wait Time",
    "queue.minutes": "minutes",
    "queue.position": "Position in queue",
    "queue.nowServing": "Now serving",

    "status.booked": "Booked",
    "status.confirmed": "Confirmed",
    "status.checkedIn": "Checked In",
    "status.called": "Called",
    "status.cancelled": "Cancelled",
    "status.completed": "Completed",
    "status.noShow": "No Show",

    "form.firstName": "First Name",
    "form.lastName": "Last Name",
    "form.email": "Email",
    "form.phone": "Phone",
    "form.notes": "Notes",
    "form.required": "Required",

    "btn.book": "Book",
    "btn.cancel": "Cancel",
    "btn.checkIn": "Check In",
    "btn.next": "Next",
    "btn.back": "Back",
    "btn.confirm": "Confirm",
    "btn.download": "Download",
    "btn.print": "Print",

    "error.slotUnavailable": "This appointment slot is no longer available.",
    "error.bookingFailed": "Booking failed. Please try again.",
    "error.notFound": "The requested entry was not found.",
    "error.networkError": "Connection error. Please check your internet connection.",
    "error.invalidInput": "Please check your input.",

    "a11y.skipToMain": "Skip to main content",
    "a11y.newTab": "Opens in new tab",
    "a11y.loading": "Loading…",
    "a11y.close": "Close",
  },

  tr: {
    "nav.bookAppointment": "Randevu Al",
    "nav.queueNumber": "Sıra Numarası",
    "nav.myAppointment": "Randevum",

    "booking.selectLocation": "Konum Seçin",
    "booking.selectService": "Hizmet Seçin",
    "booking.selectDate": "Tarih Seçin",
    "booking.yourData": "Bilgileriniz",
    "booking.confirmation": "Onay",

    "queue.yourNumber": "Sıra Numaranız",
    "queue.estimatedWait": "Tahmini Bekleme Süresi",
    "queue.minutes": "dakika",
    "queue.position": "Sıradaki pozisyon",
    "queue.nowServing": "Şu anda çağrılıyor",

    "status.booked": "Rezerve Edildi",
    "status.confirmed": "Onaylandı",
    "status.checkedIn": "Giriş Yapıldı",
    "status.called": "Çağrıldı",
    "status.cancelled": "İptal Edildi",
    "status.completed": "Tamamlandı",
    "status.noShow": "Gelmedi",

    "form.firstName": "Ad",
    "form.lastName": "Soyad",
    "form.email": "E-posta",
    "form.phone": "Telefon",
    "form.notes": "Notlar",
    "form.required": "Zorunlu alan",

    "btn.book": "Randevu Al",
    "btn.cancel": "İptal Et",
    "btn.checkIn": "Giriş Yap",
    "btn.next": "İleri",
    "btn.back": "Geri",
    "btn.confirm": "Onayla",
    "btn.download": "İndir",
    "btn.print": "Yazdır",

    "error.slotUnavailable": "Bu randevu artık mevcut değil.",
    "error.bookingFailed": "Rezervasyon başarısız oldu. Lütfen tekrar deneyin.",
    "error.notFound": "İstenen kayıt bulunamadı.",
    "error.networkError": "Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.",
    "error.invalidInput": "Lütfen girişlerinizi kontrol edin.",

    "a11y.skipToMain": "Ana içeriğe atla",
    "a11y.newTab": "Yeni sekmede açılır",
    "a11y.loading": "Yükleniyor…",
    "a11y.close": "Kapat",
  },

  ar: {
    "nav.bookAppointment": "حجز موعد",
    "nav.queueNumber": "رقم الانتظار",
    "nav.myAppointment": "موعدي",

    "booking.selectLocation": "اختر الموقع",
    "booking.selectService": "اختر الخدمة",
    "booking.selectDate": "اختر الموعد",
    "booking.yourData": "بياناتك",
    "booking.confirmation": "التأكيد",

    "queue.yourNumber": "رقم انتظارك",
    "queue.estimatedWait": "وقت الانتظار المتوقع",
    "queue.minutes": "دقائق",
    "queue.position": "الموقع في قائمة الانتظار",
    "queue.nowServing": "يتم الاستدعاء الآن",

    "status.booked": "محجوز",
    "status.confirmed": "مؤكد",
    "status.checkedIn": "تم تسجيل الوصول",
    "status.called": "تم الاستدعاء",
    "status.cancelled": "ملغى",
    "status.completed": "مكتمل",
    "status.noShow": "لم يحضر",

    "form.firstName": "الاسم الأول",
    "form.lastName": "اسم العائلة",
    "form.email": "البريد الإلكتروني",
    "form.phone": "الهاتف",
    "form.notes": "ملاحظات",
    "form.required": "حقل مطلوب",

    "btn.book": "حجز",
    "btn.cancel": "إلغاء",
    "btn.checkIn": "تسجيل الوصول",
    "btn.next": "التالي",
    "btn.back": "رجوع",
    "btn.confirm": "تأكيد",
    "btn.download": "تنزيل",
    "btn.print": "طباعة",

    "error.slotUnavailable": "هذا الموعد لم يعد متاحًا.",
    "error.bookingFailed": "فشل الحجز. يرجى المحاولة مرة أخرى.",
    "error.notFound": "لم يتم العثور على السجل المطلوب.",
    "error.networkError": "خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت.",
    "error.invalidInput": "يرجى التحقق من المدخلات.",

    "a11y.skipToMain": "انتقل إلى المحتوى الرئيسي",
    "a11y.newTab": "يفتح في علامة تبويب جديدة",
    "a11y.loading": "جارٍ التحميل…",
    "a11y.close": "إغلاق",
  },
};

// ---------------------------------------------------------------------------
// RTL Configuration
// ---------------------------------------------------------------------------

const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const STORAGE_KEY = "aitema-termin-locale";
const DEFAULT_LOCALE: Locale = "de";
const SUPPORTED_LOCALES: readonly Locale[] = ["de", "en", "tr", "ar"] as const;

let currentLocale: Locale = DEFAULT_LOCALE;

// Locale change subscribers
type LocaleChangeCallback = (locale: Locale) => void;
const subscribers: Set<LocaleChangeCallback> = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Initialise locale from storage or browser preference. */
export function initLocale(): Locale {
  // 1. Check localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      currentLocale = stored;
      applyLocale(currentLocale);
      return currentLocale;
    }

    // 2. Browser language
    const browserLang = navigator.language.split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      currentLocale = browserLang;
      applyLocale(currentLocale);
      return currentLocale;
    }
  }

  currentLocale = DEFAULT_LOCALE;
  applyLocale(currentLocale);
  return currentLocale;
}

/** Get the active locale. */
export function getCurrentLocale(): Locale {
  return currentLocale;
}

/** Get all supported locales with display names. */
export function getSupportedLocales(): Array<{ code: Locale; name: string }> {
  return [
    { code: "de", name: "Deutsch" },
    { code: "en", name: "English" },
    { code: "tr", name: "Türkçe" },
    { code: "ar", name: "العربية" },
  ];
}

/** Change the active locale. */
export function setLocale(locale: Locale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(`[i18n] Unsupported locale: ${locale}`);
    return;
  }
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  applyLocale(locale);
  subscribers.forEach((cb) => cb(locale));
}

/** Translate a key. Returns the German fallback if the key is missing. */
export function t(key: TranslationKey): string {
  const value = translations[currentLocale]?.[key];
  if (value) return value;

  // Fallback to German
  const fallback = translations.de[key];
  if (fallback) return fallback;

  // Development warning
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.warn(`[i18n] Missing translation: ${key} (${currentLocale})`);
  }
  return key;
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(callback: LocaleChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function applyLocale(locale: Locale): void {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  html.setAttribute("lang", locale);
  html.setAttribute("dir", getDirection(locale));
}
