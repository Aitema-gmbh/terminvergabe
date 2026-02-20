import { PrismaClient, EmployeeRole, AppointmentStatus, QueueStatus } from '@prisma/client';

const prisma = new PrismaClient();

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function setTime(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function bookingRef(index: number): string {
  return `TRM-2024-${String(index).padStart(5, '0')}`;
}

async function main() {
  console.log('Seeding Musterstadt demo data...');

  // ============================================================
  // TENANT
  // ============================================================
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'musterstadt' },
    update: {},
    create: {
      name: 'Stadt Musterstadt',
      slug: 'musterstadt',
      ags: '09999999',
      domain: 'termine.musterstadt.de',
      active: true,
      primaryColor: '#1e3a5f',
      timezone: 'Europe/Berlin',
      locale: 'de-DE',
    },
  });
  console.log('Tenant:', tenant.name);

  // TenantSettings
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      maxAdvanceBookingDays: 90,
      minBookingLeadHours: 1,
      cancelLeadHours: 24,
      maxBookingsPerPerson: 3,
      requireEmailVerify: true,
      queueEnabled: true,
      estimatedWaitDisplay: true,
      bundIdEnabled: false,
      reminderHoursBefore: 24,
      smsEnabled: false,
      emailEnabled: true,
      displayBoardEnabled: true,
      callSystemEnabled: false,
    },
  });

  // ============================================================
  // SERVICES (12 Stück)
  // ============================================================
  const serviceData = [
    { name: 'Personalausweis beantragen', category: 'Ausweisdokumente', duration: 20, fee: 37.00, color: '#3b82f6', requiredDocs: ['Altes Ausweisdokument', 'Biometrisches Passfoto', 'Geburtsurkundenkopie'], description: 'Beantragung eines neuen Personalausweises' },
    { name: 'Reisepass beantragen', category: 'Ausweisdokumente', duration: 25, fee: 70.00, color: '#3b82f6', requiredDocs: ['Alter Reisepass', 'Biometrisches Passfoto', 'Personalausweis'], description: 'Beantragung eines neuen Reisepasses' },
    { name: 'Meldebestätigung', category: 'Meldewesen', duration: 10, fee: 5.00, color: '#10b981', requiredDocs: ['Personalausweis'], description: 'Ausstellung einer Meldebestätigung' },
    { name: 'An-/Ummeldung Wohnsitz', category: 'Meldewesen', duration: 15, fee: 0.00, color: '#10b981', requiredDocs: ['Personalausweis', 'Wohnungsgeberbestätigung'], description: 'An- oder Ummeldung des Hauptwohnsitzes' },
    { name: 'Führungszeugnis beantragen', category: 'Justiz', duration: 10, fee: 13.00, color: '#8b5cf6', requiredDocs: ['Personalausweis'], description: 'Beantragung eines polizeilichen Führungszeugnisses' },
    { name: 'Kfz-Zulassung', category: 'KFZ', duration: 30, fee: 26.30, color: '#f59e0b', requiredDocs: ['Personalausweis', 'Fahrzeugbrief', 'Hauptuntersuchung', 'Versicherungsbestätigung (eVB)', 'SEPA-Lastschrift'], description: 'Zulassung eines Kraftfahrzeuges' },
    { name: 'Kfz-Abmeldung', category: 'KFZ', duration: 15, fee: 10.20, color: '#f59e0b', requiredDocs: ['Personalausweis', 'Fahrzeugbrief', 'Fahrzeugschein', 'Kennzeichen'], description: 'Abmeldung eines Kraftfahrzeuges' },
    { name: 'Gewerbeanmeldung', category: 'Gewerbe', duration: 20, fee: 26.00, color: '#ef4444', requiredDocs: ['Personalausweis', 'Ausgefülltes Anmeldeformular'], description: 'Anmeldung eines Gewerbebetriebs' },
    { name: 'Hundesteuer anmelden', category: 'Steuern', duration: 10, fee: 0.00, color: '#ec4899', requiredDocs: ['Personalausweis', 'Impfausweis des Hundes'], description: 'Anmeldung zur Hundesteuer' },
    { name: 'Wohngeldantrag', category: 'Soziales', duration: 30, fee: 0.00, color: '#06b6d4', requiredDocs: ['Personalausweis', 'Einkommensnachweise', 'Mietvertrag', 'Kontoauszüge'], description: 'Beantragung von Wohngeld' },
    { name: 'Beglaubigung', category: 'Beurkundung', duration: 10, fee: 5.00, color: '#64748b', requiredDocs: ['Original und Kopie des zu beglaubigenden Dokuments', 'Personalausweis'], description: 'Beglaubigung von Dokumenten und Unterschriften' },
    { name: 'Fundbüro', category: 'Sonstiges', duration: 15, fee: 0.00, color: '#84cc16', requiredDocs: ['Personalausweis'], description: 'Abgabe oder Abholung von Fundgegenständen' },
  ];

  const services: { id: string; duration: number; name: string }[] = [];
  for (let i = 0; i < serviceData.length; i++) {
    const sd = serviceData[i];
    const svc = await prisma.service.upsert({
      where: { id: `seed-service-${String(i + 1).padStart(2, '0')}` },
      update: { name: sd.name, duration: sd.duration },
      create: {
        id: `seed-service-${String(i + 1).padStart(2, '0')}`,
        tenantId: tenant.id,
        name: sd.name,
        description: sd.description,
        category: sd.category,
        duration: sd.duration,
        bufferTime: 5,
        requiredDocs: sd.requiredDocs,
        fee: sd.fee,
        active: true,
        sortOrder: i,
        color: sd.color,
      },
    });
    services.push({ id: svc.id, duration: svc.duration, name: svc.name });
  }
  console.log(`Services: ${services.length} erstellt`);

  // ============================================================
  // LOCATIONS (3 Standorte)
  // ============================================================
  const locationData = [
    {
      id: 'seed-location-01',
      name: 'Rathaus',
      address: 'Rathausplatz 1',
      postalCode: '99999',
      city: 'Musterstadt',
      phone: '09999 1234-0',
      email: 'rathaus@musterstadt.de',
      counterCount: 5,
      latitude: 48.1374,
      longitude: 11.5755,
    },
    {
      id: 'seed-location-02',
      name: 'Bürgerbüro Nord',
      address: 'Nordstraße 42',
      postalCode: '99999',
      city: 'Musterstadt',
      phone: '09999 1234-100',
      email: 'nord@musterstadt.de',
      counterCount: 3,
      latitude: 48.1450,
      longitude: 11.5800,
    },
    {
      id: 'seed-location-03',
      name: 'Bürgerbüro Süd',
      address: 'Südallee 8',
      postalCode: '99999',
      city: 'Musterstadt',
      phone: '09999 1234-200',
      email: 'sued@musterstadt.de',
      counterCount: 2,
      latitude: 48.1300,
      longitude: 11.5700,
    },
  ];

  const locations: { id: string; name: string; counterCount: number }[] = [];
  for (const ld of locationData) {
    const loc = await prisma.location.upsert({
      where: { id: ld.id },
      update: { name: ld.name },
      create: {
        id: ld.id,
        tenantId: tenant.id,
        name: ld.name,
        address: ld.address,
        postalCode: ld.postalCode,
        city: ld.city,
        phone: ld.phone,
        email: ld.email,
        latitude: ld.latitude,
        longitude: ld.longitude,
        active: true,
      },
    });
    locations.push({ id: loc.id, name: loc.name, counterCount: ld.counterCount });
  }
  console.log(`Locations: ${locations.length} erstellt`);

  // ============================================================
  // OPENING HOURS
  // ============================================================
  // Mo=0, Di=1, Mi=2, Do=3, Fr=4
  const openingHoursData = [
    { dayOfWeek: 0, openTime: '08:00', closeTime: '16:00' }, // Mo
    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00' }, // Di
    { dayOfWeek: 2, openTime: '08:00', closeTime: '12:00' }, // Mi
    { dayOfWeek: 3, openTime: '08:00', closeTime: '16:00' }, // Do
    { dayOfWeek: 4, openTime: '08:00', closeTime: '16:00' }, // Fr
  ];

  for (const loc of locations) {
    for (const oh of openingHoursData) {
      const existing = await prisma.openingHours.findFirst({
        where: { locationId: loc.id, dayOfWeek: oh.dayOfWeek, specificDate: null },
      });
      if (!existing) {
        await prisma.openingHours.create({
          data: {
            locationId: loc.id,
            dayOfWeek: oh.dayOfWeek,
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            closed: false,
          },
        });
      }
    }
  }
  console.log('Öffnungszeiten: Mo-Fr gesetzt');

  // ============================================================
  // COUNTERS
  // ============================================================
  const allCounters: { id: string; locationId: string; number: number }[] = [];
  for (const loc of locations) {
    for (let n = 1; n <= loc.counterCount; n++) {
      const counterId = `seed-counter-${loc.id.slice(-2)}-${String(n).padStart(2, '0')}`;
      const counter = await prisma.counter.upsert({
        where: { locationId_number: { locationId: loc.id, number: n } },
        update: {},
        create: {
          id: counterId,
          locationId: loc.id,
          number: n,
          name: `Schalter ${n}`,
          active: true,
        },
      });
      allCounters.push({ id: counter.id, locationId: loc.id, number: n });
    }
  }
  console.log(`Counter: ${allCounters.length} erstellt`);

  // ============================================================
  // LOCATION SERVICES (alle Services an allen Standorten)
  // ============================================================
  for (const loc of locations) {
    for (const svc of services) {
      await prisma.locationService.upsert({
        where: { locationId_serviceId: { locationId: loc.id, serviceId: svc.id } },
        update: {},
        create: { locationId: loc.id, serviceId: svc.id, active: true },
      });
    }
  }
  console.log('LocationServices: alle Services an allen Standorten verknüpft');

  // ============================================================
  // STAFF USERS (5 Mitarbeiter)
  // ============================================================
  const staffData = [
    { id: 'seed-emp-01', name: 'Martina Hoffmann', email: 'm.hoffmann@musterstadt.de', role: EmployeeRole.ADMIN },
    { id: 'seed-emp-02', name: 'Klaus Berger', email: 'k.berger@musterstadt.de', role: EmployeeRole.TEAMLEITER },
    { id: 'seed-emp-03', name: 'Sandra Müller', email: 's.mueller@musterstadt.de', role: EmployeeRole.SACHBEARBEITER },
    { id: 'seed-emp-04', name: 'Thomas Weber', email: 't.weber@musterstadt.de', role: EmployeeRole.SACHBEARBEITER },
    { id: 'seed-emp-05', name: 'Julia Bauer', email: 'j.bauer@musterstadt.de', role: EmployeeRole.EMPFANG },
  ];

  const employees: { id: string; name: string }[] = [];
  for (const ed of staffData) {
    const emp = await prisma.employee.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: ed.email } },
      update: {},
      create: {
        id: ed.id,
        tenantId: tenant.id,
        name: ed.name,
        email: ed.email,
        role: ed.role,
        active: true,
      },
    });
    employees.push({ id: emp.id, name: emp.name });
  }
  console.log(`Employees: ${employees.length} erstellt`);

  // ============================================================
  // APPOINTMENTS (200 Buchungen: -30 bis +14 Tage)
  // ============================================================
  const citizenNames = [
    'Anna Schmidt', 'Peter Wagner', 'Maria Fischer', 'Hans Müller', 'Lisa Schneider',
    'Michael Braun', 'Laura Zimmermann', 'Stefan Koch', 'Sabine Becker', 'Andreas Wolf',
    'Christine Schäfer', 'Markus Lehmann', 'Nicole Krause', 'Jürgen Schwarz', 'Petra Lange',
    'Tobias Richter', 'Monika Krüger', 'Frank Schulz', 'Claudia Maier', 'Rainer Huber',
    'Ursula König', 'Dieter Meier', 'Brigitte Herrmann', 'Werner Roth', 'Ingrid Klein',
  ];

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Bereinige alte Seed-Appointments
  await prisma.appointment.deleteMany({
    where: { tenantId: tenant.id, bookingRef: { startsWith: 'TRM-2024-' } },
  });

  let apptIndex = 1;
  const appointmentsCreated: number[] = [];

  for (let dayOffset = -30; dayOffset <= 14; dayOffset++) {
    const apptDate = new Date(todayDate);
    apptDate.setDate(todayDate.getDate() + dayOffset);
    const dow = apptDate.getDay(); // 0=Sun, 1=Mon...6=Sat

    // Wochenende überspringen
    if (dow === 0 || dow === 6) continue;

    // Öffnungszeiten nach Wochentag (0=Mon in Schema, JS: 1=Mon)
    const jsDow = dow - 1; // 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri
    let openH = 8, openM = 0, closeH = 16, closeM = 0;
    if (jsDow === 1) { closeH = 18; }    // Di
    if (jsDow === 2) { closeH = 12; }    // Mi

    // Zufällige Anzahl Termine pro Tag (3-8)
    const apptPerDay = randomBetween(3, 8);
    for (let a = 0; a < apptPerDay && apptIndex <= 200; a++) {
      const loc = randomElement(locations);
      const svc = randomElement(services);
      const startHour = randomBetween(openH, closeH - 1);
      const startMin = randomElement([0, 15, 30, 45]);

      const startTime = new Date(apptDate);
      startTime.setHours(startHour, startMin, 0, 0);
      const endTime = addMinutes(startTime, svc.duration);

      // Status basierend auf Datum
      let status: AppointmentStatus;
      if (dayOffset < -1) {
        status = randomElement([AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED]);
      } else if (dayOffset === 0) {
        status = randomElement([AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED, AppointmentStatus.BOOKED]);
      } else {
        status = randomElement([AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED]);
      }

      const citizenName = randomElement(citizenNames);
      const firstLast = citizenName.toLowerCase().replace(' ', '.');
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          locationId: loc.id,
          serviceId: svc.id,
          employeeId: randomElement(employees).id,
          date: apptDate,
          startTime,
          endTime,
          citizenName,
          citizenEmail: `${firstLast}@example.de`,
          citizenPhone: `0${randomBetween(100, 999)} ${randomBetween(1000000, 9999999)}`,
          status,
          bookingRef: bookingRef(apptIndex),
          confirmationSent: true,
          reminderSent: dayOffset <= 1,
          completedAt: status === AppointmentStatus.COMPLETED ? endTime : null,
          checkedInAt: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED].includes(status) ? startTime : null,
        },
      });
      apptIndex++;
      appointmentsCreated.push(dayOffset);
    }
  }
  console.log(`Appointments: ${apptIndex - 1} erstellt`);

  // ============================================================
  // QUEUE ENTRIES (30 Tickets für heute)
  // ============================================================
  await prisma.queueEntry.deleteMany({
    where: { tenantId: tenant.id, ticketNumber: { startsWith: 'A0' } },
  });

  const queueStatuses = [
    QueueStatus.WAITING, QueueStatus.WAITING, QueueStatus.WAITING, QueueStatus.WAITING,
    QueueStatus.CALLED, QueueStatus.IN_PROGRESS,
    QueueStatus.COMPLETED, QueueStatus.COMPLETED, QueueStatus.COMPLETED,
  ];

  const countersForToday = allCounters.filter((c) => c.locationId === locations[0].id);

  for (let i = 1; i <= 30; i++) {
    const loc = randomElement(locations);
    const svc = randomElement(services);
    const status = randomElement(queueStatuses);
    const locCounters = allCounters.filter((c) => c.locationId === loc.id);
    const counter = status !== QueueStatus.WAITING ? randomElement(locCounters) : null;

    const createdAt = new Date(todayDate);
    createdAt.setHours(randomBetween(8, 11), randomBetween(0, 59), 0, 0);

    await prisma.queueEntry.create({
      data: {
        tenantId: tenant.id,
        locationId: loc.id,
        serviceId: svc.id,
        counterId: counter?.id ?? null,
        ticketNumber: `A${String(i).padStart(3, '0')}`,
        citizenName: status !== QueueStatus.WAITING ? randomElement(citizenNames) : null,
        status,
        priority: 0,
        createdAt,
        calledAt: [QueueStatus.CALLED, QueueStatus.IN_PROGRESS, QueueStatus.COMPLETED].includes(status) ? addMinutes(createdAt, randomBetween(5, 30)) : null,
        startedAt: [QueueStatus.IN_PROGRESS, QueueStatus.COMPLETED].includes(status) ? addMinutes(createdAt, randomBetween(10, 40)) : null,
        completedAt: status === QueueStatus.COMPLETED ? addMinutes(createdAt, randomBetween(15, 60)) : null,
        estimatedWait: status === QueueStatus.WAITING ? randomBetween(5, 45) : null,
      },
    });
  }
  console.log('Queue Entries: 30 Tickets für heute erstellt');

  console.log('\nSeed abgeschlossen!');
  console.log('  Tenant: Stadt Musterstadt (slug: musterstadt)');
  console.log('  Standorte: 3 (Rathaus, Bürgerbüro Nord, Bürgerbüro Süd)');
  console.log('  Services: 12');
  console.log('  Öffnungszeiten: Mo-Fr');
  console.log('  Counter: 10 gesamt');
  console.log(`  Appointments: ${apptIndex - 1}`);
  console.log('  Queue Entries: 30');
  console.log('  Mitarbeiter: 5');
}

main()
  .catch((e) => {
    console.error('Seed Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
