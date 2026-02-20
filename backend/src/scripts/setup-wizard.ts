#!/usr/bin/env ts-node
/**
 * aitema|Termin - Setup Wizard
 * CLI-Ersteinrichtung fuer neue Kommunen
 *
 * Aufruf: ts-node src/scripts/setup-wizard.ts
 */

import * as readline from 'readline';
import { PrismaClient, EmployeeRole } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// Hilfsfunktionen
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function questionWithDefault(
  rl: readline.Interface,
  prompt: string,
  defaultValue: string
): Promise<string> {
  const answer = await question(rl, `${prompt} [${defaultValue}]: `);
  return answer || defaultValue;
}

async function questionYesNo(
  rl: readline.Interface,
  prompt: string,
  defaultYes = true
): Promise<boolean> {
  const hint = defaultYes ? 'J/n' : 'j/N';
  const answer = await question(rl, `${prompt} (${hint}): `);
  if (!answer) return defaultYes;
  return answer.toLowerCase() === 'j' || answer.toLowerCase() === 'y';
}

function printSeparator(): void {
  console.log('\n' + '='.repeat(60));
}

function printSection(title: string): void {
  printSeparator();
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============================================================
// Schritt 1: Tenant anlegen
// ============================================================
async function setupTenant(
  rl: readline.Interface
): Promise<{ tenantId: string; tenantSlug: string }> {
  printSection('Schritt 1/4: Kommune einrichten');

  const name = await question(rl, 'Name der Kommune (z.B. Stadt Musterstadt): ');
  if (!name) throw new Error('Kommunenname darf nicht leer sein.');

  const suggestedSlug = slugify(name);
  const slug = await questionWithDefault(rl, 'URL-Slug', suggestedSlug);
  const ags = await question(rl, 'Amtlicher Gemeindeschlüssel (AGS, 8-stellig, optional): ');
  const domain = await question(rl, 'Custom Domain (z.B. termine.musterstadt.de, optional): ');
  const primaryColor = await questionWithDefault(rl, 'Primärfarbe (Hex)', '#1e3a5f');
  const timezone = await questionWithDefault(rl, 'Zeitzone', 'Europe/Berlin');

  // Prüfen ob Slug bereits existiert
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    const overwrite = await questionYesNo(
      rl,
      `Tenant mit Slug "${slug}" existiert bereits. Überschreiben?`,
      false
    );
    if (!overwrite) {
      console.log('Abgebrochen.');
      process.exit(0);
    }
    await prisma.tenant.update({
      where: { slug },
      data: { name, ags: ags || null, domain: domain || null, primaryColor, timezone },
    });
    console.log(`\nTenant aktualisiert: ${name} (${slug})`);
    return { tenantId: existing.id, tenantSlug: slug };
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      ags: ags || null,
      domain: domain || null,
      primaryColor,
      timezone,
      locale: 'de-DE',
      active: true,
    },
  });

  // Standard-Settings
  await prisma.tenantSettings.create({
    data: {
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

  console.log(`\nTenant angelegt: ${name} (${slug})`);
  return { tenantId: tenant.id, tenantSlug: slug };
}

// ============================================================
// Schritt 2: Admin-User anlegen
// ============================================================
async function setupAdmin(rl: readline.Interface, tenantId: string): Promise<void> {
  printSection('Schritt 2/4: Admin-Benutzer anlegen');

  const name = await question(rl, 'Name des Admins: ');
  if (!name) throw new Error('Name darf nicht leer sein.');

  const email = await question(rl, 'E-Mail-Adresse: ');
  if (!email || !email.includes('@')) throw new Error('Ungültige E-Mail-Adresse.');

  const existing = await prisma.employee.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  if (existing) {
    console.log(`Admin ${email} existiert bereits.`);
    return;
  }

  await prisma.employee.create({
    data: {
      tenantId,
      name,
      email,
      role: EmployeeRole.ADMIN,
      active: true,
    },
  });

  console.log(`\nAdmin-Benutzer angelegt: ${name} (${email})`);
  console.log('Hinweis: Passwort wird über das Auth-System gesetzt.');
}

// ============================================================
// Schritt 3: Erster Standort + Öffnungszeiten
// ============================================================
async function setupLocation(rl: readline.Interface, tenantId: string): Promise<string> {
  printSection('Schritt 3/4: Erster Standort einrichten');

  const name = await question(rl, 'Name des Standorts (z.B. Rathaus): ');
  if (!name) throw new Error('Standortname darf nicht leer sein.');

  const address = await question(rl, 'Straße und Hausnummer: ');
  const postalCode = await question(rl, 'PLZ: ');
  const city = await question(rl, 'Ort: ');
  const phone = await question(rl, 'Telefon (optional): ');
  const email = await question(rl, 'E-Mail (optional): ');

  const counterCountStr = await questionWithDefault(rl, 'Anzahl Schalter', '3');
  const counterCount = parseInt(counterCountStr, 10) || 3;

  const location = await prisma.location.create({
    data: {
      tenantId,
      name,
      address: address || null,
      postalCode: postalCode || null,
      city: city || null,
      phone: phone || null,
      email: email || null,
      active: true,
    },
  });

  // Schalter anlegen
  for (let i = 1; i <= counterCount; i++) {
    await prisma.counter.create({
      data: {
        locationId: location.id,
        number: i,
        name: `Schalter ${i}`,
        active: true,
      },
    });
  }
  console.log(`\n${counterCount} Schalter angelegt.`);

  // Öffnungszeiten
  console.log('\nÖffnungszeiten einrichten:');
  console.log('Format: HH:MM (z.B. 08:00). Leer lassen = geschlossen.\n');

  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const defaults = [
    { open: '08:00', close: '16:00' },
    { open: '08:00', close: '18:00' },
    { open: '08:00', close: '12:00' },
    { open: '08:00', close: '16:00' },
    { open: '08:00', close: '16:00' },
    { open: '', close: '' },
    { open: '', close: '' },
  ];

  for (let dow = 0; dow < 7; dow++) {
    const def = defaults[dow];
    const openTime = await questionWithDefault(
      rl,
      `${days[dow]} - Öffnet`,
      def.open || 'geschlossen'
    );

    if (!openTime || openTime === 'geschlossen') {
      await prisma.openingHours.create({
        data: { locationId: location.id, dayOfWeek: dow, openTime: '00:00', closeTime: '00:00', closed: true },
      });
      continue;
    }

    const closeTime = await questionWithDefault(rl, `${days[dow]} - Schließt`, def.close);

    await prisma.openingHours.create({
      data: { locationId: location.id, dayOfWeek: dow, openTime, closeTime, closed: false },
    });
  }

  console.log(`\nStandort "${name}" mit Öffnungszeiten angelegt.`);
  return location.id;
}

// ============================================================
// Schritt 4: Erste Services anlegen
// ============================================================
async function setupServices(
  rl: readline.Interface,
  tenantId: string,
  locationId: string
): Promise<void> {
  printSection('Schritt 4/4: Erste Dienstleistungen anlegen');

  console.log('Mindestens eine Dienstleistung ist erforderlich.');
  console.log('Weitere können später im Admin-Panel hinzugefügt werden.\n');

  let addMore = true;
  let sortOrder = 0;

  while (addMore) {
    const name = await question(rl, 'Name der Dienstleistung: ');
    if (!name) break;

    const durationStr = await questionWithDefault(rl, 'Dauer in Minuten', '15');
    const duration = parseInt(durationStr, 10) || 15;

    const category = await questionWithDefault(rl, 'Kategorie', 'Allgemein');

    const feeStr = await question(rl, 'Gebühr in EUR (leer = kostenlos): ');
    const fee = feeStr ? parseFloat(feeStr) : null;

    const docsInput = await question(rl, 'Benötigte Unterlagen (kommagetrennt, optional): ');
    const requiredDocs = docsInput
      ? docsInput.split(',').map((d) => d.trim()).filter(Boolean)
      : [];

    const service = await prisma.service.create({
      data: {
        tenantId,
        name,
        category,
        duration,
        bufferTime: 5,
        requiredDocs,
        fee,
        active: true,
        sortOrder: sortOrder++,
        color: '#3b82f6',
      },
    });

    // Service am Standort aktivieren
    await prisma.locationService.create({
      data: { locationId, serviceId: service.id, active: true },
    });

    console.log(`  Dienstleistung "${name}" (${duration} min) angelegt.`);

    addMore = await questionYesNo(rl, '\nWeitere Dienstleistung hinzufügen?', true);
  }

  const total = await prisma.service.count({ where: { tenantId } });
  console.log(`\nDienstleistungen gesamt: ${total}`);
}

// ============================================================
// Abschluss
// ============================================================
function printSummary(tenantSlug: string): void {
  printSeparator();
  console.log('\n  Setup abgeschlossen!');
  printSeparator();
  console.log('\nNächste Schritte:');
  console.log('  1. Datenbankmigrationen ausführen:  npx prisma migrate deploy');
  console.log('  2. Backend starten:                 npm run dev');
  console.log(`  3. Buchungsportal aufrufen:         http://localhost:3000/${tenantSlug}`);
  console.log('  4. Admin-Panel aufrufen:            http://localhost:3000/admin');
  console.log('\nFalls Passwörter konfiguriert werden müssen:');
  console.log('  npx ts-node src/scripts/reset-password.ts\n');
}

// ============================================================
// Main
// ============================================================
async function main(): Promise<void> {
  const rl = createInterface();

  console.log('\n');
  console.log('  aitema|Termin - Setup Wizard');
  console.log('  Terminvergabe fuer deutsche Kommunen');
  console.log('\n  Dieser Assistent richtet eine neue Kommune ein.');
  console.log('  Alle Angaben koennen spaeter im Admin-Panel geaendert werden.');

  try {
    const { tenantId, tenantSlug } = await setupTenant(rl);
    await setupAdmin(rl, tenantId);
    const locationId = await setupLocation(rl, tenantId);
    await setupServices(rl, tenantId, locationId);
    printSummary(tenantSlug);
  } catch (err) {
    console.error('\nFehler:', (err as Error).message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
