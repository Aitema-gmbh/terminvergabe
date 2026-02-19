/**
 * aitema|Termin - Demo-Daten-Generator
 *
 * Erstellt Muster-Tenant "musterstadt" mit:
 * - 2 Locations (Rathaus Musterstadt, Buergerbuero Nord)
 * - 8 Services (Personalausweis, Reisepass, Meldebestaetigung, etc.)
 * - 4 Employees mit verschiedenen Rollen
 * - 3 Counters pro Location
 * - Oeffnungszeiten Mo-Fr 8-16 Uhr
 * - 20 Beispiel-Termine verteilt ueber die naechste Woche
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed-Daten fuer die Musterstadt.
 */
export async function seedMusterstadt(): Promise<SeedResult> {
  const counts: Record<string, number> = {};

  // ========================================
  // Tenant
  // ========================================
  const tenant = await prisma.tenant.upsert({
    where: { slug: "musterstadt" },
    update: {},
    create: {
      name: "Stadt Musterstadt",
      slug: "musterstadt",
      active: true,
      settings: {
        maxBookingsPerPerson: 3,
        bookingLeadDays: 30,
        reminderHoursBefore: 24,
        allowWalkIn: true,
        theme: {
          primaryColor: "#1e3a5f",
          logo: "/assets/musterstadt-wappen.svg",
        },
      },
    },
  });

  const tenantId = tenant.id;

  // ========================================
  // Tenant Settings
  // ========================================
  await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      maxBookingsPerPerson: 3,
      bookingLeadDays: 30,
      reminderHoursBefore: 24,
      cancelDeadlineHours: 2,
      allowWalkIn: true,
    },
  });

  // ========================================
  // Locations
  // ========================================
  const locationsData = [
    {
      name: "Rathaus Musterstadt",
      slug: "rathaus",
      address: "Marktplatz 1, 12345 Musterstadt",
      phone: "03456 / 123-0",
      email: "buergerservice@musterstadt.de",
      latitude: 51.3397,
      longitude: 12.3731,
    },
    {
      name: "Buergerbuero Nord",
      slug: "buergerbuero-nord",
      address: "Nordstrasse 42, 12345 Musterstadt",
      phone: "03456 / 123-500",
      email: "nord@musterstadt.de",
      latitude: 51.3450,
      longitude: 12.3780,
    },
  ];

  const locations: any[] = [];
  for (const loc of locationsData) {
    const location = await prisma.location.upsert({
      where: {
        tenantId_slug: { tenantId, slug: loc.slug },
      },
      update: {},
      create: {
        tenantId,
        name: loc.name,
        slug: loc.slug,
        address: loc.address,
        phone: loc.phone,
        email: loc.email,
        active: true,
      },
    });
    locations.push(location);
  }
  counts["locations"] = locations.length;

  // ========================================
  // Services (8 Dienstleistungen)
  // ========================================
  const servicesData = [
    {
      name: "Personalausweis beantragen",
      slug: "personalausweis",
      category: "Ausweisdokumente",
      duration: 20,
      bufferTime: 5,
      description:
        "Beantragung eines neuen Personalausweises. Benoetigte Unterlagen: Biometrisches Passfoto, alter Ausweis.",
      requiredDocs: ["Biometrisches Passfoto", "Alter Personalausweis", "Geburts-/Heiratsurkunde"],
      fee: 37.0,
      sortOrder: 1,
    },
    {
      name: "Reisepass beantragen",
      slug: "reisepass",
      category: "Ausweisdokumente",
      duration: 25,
      bufferTime: 5,
      description: "Beantragung eines neuen Reisepasses.",
      requiredDocs: ["Biometrisches Passfoto", "Alter Reisepass", "Personalausweis"],
      fee: 60.0,
      sortOrder: 2,
    },
    {
      name: "Meldebestaetigung",
      slug: "meldebestaetigung",
      category: "Meldewesen",
      duration: 10,
      bufferTime: 5,
      description: "Ausstellung einer Meldebestaetigung / Aufenthaltsbestaetigung.",
      requiredDocs: ["Personalausweis"],
      fee: 5.0,
      sortOrder: 3,
    },
    {
      name: "Fuehrungszeugnis beantragen",
      slug: "fuehrungszeugnis",
      category: "Meldewesen",
      duration: 15,
      bufferTime: 5,
      description: "Beantragung eines Fuehrungszeugnisses (einfach oder erweitert).",
      requiredDocs: ["Personalausweis"],
      fee: 13.0,
      sortOrder: 4,
    },
    {
      name: "KFZ-Zulassung / Ummeldung",
      slug: "kfz-zulassung",
      category: "Verkehr",
      duration: 30,
      bufferTime: 5,
      description: "An-, Ab- oder Ummeldung eines Kraftfahrzeugs.",
      requiredDocs: [
        "Personalausweis",
        "Fahrzeugbrief (Zulassungsbescheinigung Teil II)",
        "Fahrzeugschein (Zulassungsbescheinigung Teil I)",
        "eVB-Nummer",
        "HU-Nachweis",
      ],
      fee: 26.3,
      sortOrder: 5,
    },
    {
      name: "Wohnsitz an-/ummelden",
      slug: "wohnsitz",
      category: "Meldewesen",
      duration: 15,
      bufferTime: 5,
      description: "An- oder Ummeldung des Wohnsitzes bei Umzug.",
      requiredDocs: [
        "Personalausweis",
        "Wohnungsgeberbescheinigung",
      ],
      fee: 0,
      sortOrder: 6,
    },
    {
      name: "Gewerbeanmeldung",
      slug: "gewerbe",
      category: "Gewerbe",
      duration: 20,
      bufferTime: 5,
      description: "Anmeldung eines neuen Gewerbes.",
      requiredDocs: [
        "Personalausweis",
        "Gewerbeanmeldeformular",
        "ggf. Handelsregisterauszug",
      ],
      fee: 26.0,
      sortOrder: 7,
    },
    {
      name: "Fundbuero - Fundanzeige / Verlustanzeige",
      slug: "fundbuero",
      category: "Sonstiges",
      duration: 10,
      bufferTime: 5,
      description: "Abgabe einer Fundanzeige oder Verlustanzeige.",
      requiredDocs: ["Personalausweis"],
      fee: 0,
      sortOrder: 8,
    },
  ];

  const services: any[] = [];
  for (const svc of servicesData) {
    const service = await prisma.service.upsert({
      where: {
        tenantId_slug: { tenantId, slug: svc.slug },
      },
      update: {},
      create: {
        tenantId,
        name: svc.name,
        slug: svc.slug,
        category: svc.category,
        duration: svc.duration,
        bufferTime: svc.bufferTime,
        description: svc.description,
        requiredDocs: svc.requiredDocs,
        fee: svc.fee,
        sortOrder: svc.sortOrder,
        active: true,
      },
    });
    services.push(service);

    // Service an beide Locations binden
    for (const loc of locations) {
      await prisma.locationService.upsert({
        where: {
          locationId_serviceId: { locationId: loc.id, serviceId: service.id },
        },
        update: {},
        create: {
          locationId: loc.id,
          serviceId: service.id,
          active: true,
        },
      });
    }
  }
  counts["services"] = services.length;

  // ========================================
  // Employees (4 Mitarbeiter)
  // ========================================
  const employeesData = [
    { name: "Anna Berger", email: "a.berger@musterstadt.de", role: "admin" },
    { name: "Markus Klein", email: "m.klein@musterstadt.de", role: "staff" },
    { name: "Laura Fischer", email: "l.fischer@musterstadt.de", role: "staff" },
    { name: "Jan Hoffmann", email: "j.hoffmann@musterstadt.de", role: "staff" },
  ];

  const employees: any[] = [];
  for (const emp of employeesData) {
    const employee = await prisma.employee.upsert({
      where: {
        tenantId_email: { tenantId, email: emp.email },
      },
      update: {},
      create: {
        tenantId,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        active: true,
      },
    });
    employees.push(employee);
  }
  counts["employees"] = employees.length;

  // ========================================
  // Counters (3 pro Location)
  // ========================================
  let counterCount = 0;
  const allCounters: any[] = [];

  for (const loc of locations) {
    for (let i = 1; i <= 3; i++) {
      const counter = await prisma.counter.upsert({
        where: {
          locationId_number: { locationId: loc.id, number: i },
        },
        update: {},
        create: {
          tenantId,
          locationId: loc.id,
          name: `Schalter ${i}`,
          number: i,
          active: true,
        },
      });
      allCounters.push(counter);
      counterCount++;
    }
  }
  counts["counters"] = counterCount;

  // ========================================
  // Oeffnungszeiten (Mo-Fr 8-16 Uhr)
  // ========================================
  let hoursCount = 0;
  for (const loc of locations) {
    for (let day = 0; day < 5; day++) {
      // Mo=0, Di=1, Mi=2, Do=3, Fr=4
      await prisma.openingHours.upsert({
        where: {
          locationId_dayOfWeek: { locationId: loc.id, dayOfWeek: day },
        },
        update: {},
        create: {
          locationId: loc.id,
          dayOfWeek: day,
          openTime: "08:00",
          closeTime: "16:00",
          closed: false,
        },
      });
      hoursCount++;
    }
    // Sa + So geschlossen
    for (let day = 5; day < 7; day++) {
      await prisma.openingHours.upsert({
        where: {
          locationId_dayOfWeek: { locationId: loc.id, dayOfWeek: day },
        },
        update: {},
        create: {
          locationId: loc.id,
          dayOfWeek: day,
          openTime: "00:00",
          closeTime: "00:00",
          closed: true,
        },
      });
      hoursCount++;
    }
  }
  counts["openingHours"] = hoursCount;

  // ========================================
  // 20 Beispiel-Termine (naechste Woche)
  // ========================================
  const firstNames = [
    "Max", "Anna", "Lukas", "Sophie", "Felix",
    "Emma", "Leon", "Mia", "Jonas", "Hannah",
    "Tim", "Lena", "Moritz", "Sarah", "Jan",
    "Lisa", "Paul", "Marie", "David", "Julia",
  ];
  const lastNames = [
    "Mueller", "Schmidt", "Schneider", "Fischer", "Weber",
    "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    "Koch", "Richter", "Wolf", "Schroeder", "Neumann",
    "Schwarz", "Braun", "Zimmermann", "Hartmann", "Krause",
  ];

  const now = new Date();
  let appointmentCount = 0;

  for (let i = 0; i < 20; i++) {
    const dayOffset = 1 + Math.floor(i / 4); // 1-5 Tage voraus
    const hour = 8 + (i % 8);                // 8-15 Uhr
    const locIdx = i % 2;                     // Abwechselnd Locations
    const svcIdx = i % services.length;       // Durchrotieren

    const appointmentDate = new Date(now);
    appointmentDate.setDate(now.getDate() + dayOffset);
    // Wochenende ueberspringen
    while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }
    appointmentDate.setHours(hour, 0, 0, 0);

    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + services[svcIdx].duration);

    const dateOnly = new Date(appointmentDate);
    dateOnly.setHours(0, 0, 0, 0);

    const citizen = `${firstNames[i]} ${lastNames[i]}`;
    const year = now.getFullYear();
    const seq = String(i + 1).padStart(5, "0");
    const bookingRef = `TRM-${year}-${seq}`;

    // Status variieren
    const statuses = ["BOOKED", "BOOKED", "CONFIRMED", "BOOKED", "CONFIRMED"];
    const status = statuses[i % statuses.length];

    try {
      await prisma.appointment.create({
        data: {
          tenantId,
          locationId: locations[locIdx].id,
          serviceId: services[svcIdx].id,
          date: dateOnly,
          startTime: appointmentDate,
          endTime,
          citizenName: citizen,
          citizenEmail: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.de`,
          citizenPhone: `0170 ${String(1000000 + i * 12345).slice(0, 7)}`,
          bookingRef,
          status,
        },
      });
      appointmentCount++;
    } catch {
      // Duplikate ignorieren bei erneutem Seed
    }
  }
  counts["appointments"] = appointmentCount;

  return {
    tenant: tenant.slug,
    tenantId: tenant.id,
    counts,
  };
}

// ========================================
// Types
// ========================================
interface SeedResult {
  tenant: string;
  tenantId: string;
  counts: Record<string, number>;
}

export default { seedMusterstadt };
