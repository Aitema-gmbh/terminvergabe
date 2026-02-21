/**
 * M3: CalDAV / iCal Staff-Kalender
 *
 * Jeder Mitarbeiter kann einen persoenlichen iCal-Feed generieren und
 * in Outlook, Apple Calendar oder Google Calendar abonnieren.
 *
 * Endpoints:
 *   POST /api/v1/admin/staff/:employeeId/calendar/generate-token
 *     -> Generiert einen neuen Auth-Token fuer den Kalender-Feed
 *   GET  /api/v1/admin/staff/:employeeId/calendar.ics?token=xxx
 *     -> Liefert die naechsten 60 Tage Termine als iCal-Datei
 */
import { FastifyInstance } from "fastify";
import ICalCalendar, { ICalCalendarMethod } from "ical-generator";
import { randomBytes } from "crypto";
import { prisma } from "../../server.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

// In-Memory Token Store (wird via Redis persistiert)
// Format: Map<employeeId, token>
import { redis } from "../../server.js";

const CALENDAR_TOKEN_PREFIX = "calendar:token:";
const CALENDAR_TOKEN_TTL = 365 * 24 * 60 * 60; // 1 Jahr in Sekunden

async function getEmployeeToken(employeeId: string): Promise<string | null> {
  return redis.get(`${CALENDAR_TOKEN_PREFIX}${employeeId}`);
}

async function setEmployeeToken(employeeId: string, token: string): Promise<void> {
  await redis.set(`${CALENDAR_TOKEN_PREFIX}${employeeId}`, token, "EX", CALENDAR_TOKEN_TTL);
}

async function validateEmployeeToken(employeeId: string, token: string): Promise<boolean> {
  const storedToken = await getEmployeeToken(employeeId);
  return storedToken === token;
}

export async function calendarRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/admin/staff/:employeeId/calendar/generate-token
   * Generiert einen neuen iCal-Feed-Token fuer einen Mitarbeiter.
   * Erfordert Admin-Authentifizierung.
   */
  app.post(
    "/staff/:employeeId/calendar/generate-token",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["calendar"],
        summary: "Kalender-Feed Token generieren",
      },
    },
    async (request, reply) => {
      const { employeeId } = request.params as { employeeId: string };

      // Mitarbeiter existiert?
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true, email: true },
      });
      if (!employee) {
        return reply.status(404).send({ error: "Mitarbeiter nicht gefunden" });
      }

      // Neuen Token generieren
      const token = randomBytes(32).toString("hex");
      await setEmployeeToken(employeeId, token);

      const feedUrl = `${process.env.PUBLIC_URL || "https://termin.aitema.de"}/api/v1/admin/staff/${employeeId}/calendar.ics?token=${token}`;

      return {
        success: true,
        data: {
          employeeId,
          employeeName: employee.name,
          token,
          feedUrl,
          expiresIn: "365 Tage",
        },
      };
    }
  );

  /**
   * GET /api/v1/admin/staff/:employeeId/calendar.ics?token=xxx
   * Liefert die Termine des Mitarbeiters als iCal-Datei.
   * Oeffentlich zugaenglich (durch Token geschuetzt).
   */
  app.get(
    "/staff/:employeeId/calendar.ics",
    {
      schema: {
        tags: ["calendar"],
        summary: "Persoenlicher Kalender-Feed (iCal)",
      },
    },
    async (request, reply) => {
      const { employeeId } = request.params as { employeeId: string };
      const { token } = request.query as { token?: string };

      if (!token) {
        return reply.status(401).send("Unauthorized: Token fehlt");
      }

      const isValid = await validateEmployeeToken(employeeId, token);
      if (!isValid) {
        return reply.status(401).send("Unauthorized: Ungültiger Token");
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true },
      });
      if (!employee) {
        return reply.status(404).send("Mitarbeiter nicht gefunden");
      }

      // Termine der naechsten 60 Tage
      const now = new Date();
      const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          employeeId,
          date: { gte: now, lte: in60days },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        include: {
          service: { select: { name: true, duration: true } },
          location: { select: { name: true, address: true } },
        },
        orderBy: { startTime: "asc" },
      });

      // iCal generieren
      const cal = ICalCalendar({
        name: `aitema Termine – ${employee.name}`,
        prodId: "//aitema//Terminvergabe//DE",
        timezone: "Europe/Berlin",
        method: ICalCalendarMethod.PUBLISH,
      });

      for (const apt of appointments) {
        const durationMs = (apt.service?.duration || 15) * 60 * 1000;
        const startTime = apt.startTime;
        const endTime = apt.endTime || new Date(startTime.getTime() + durationMs);

        const locationStr = [
          apt.location?.name,
          apt.location?.address,
        ]
          .filter(Boolean)
          .join(", ");

        cal.createEvent({
          id: `apt-${apt.id}@aitema.de`,
          start: startTime,
          end: endTime,
          summary: apt.service?.name || "Termin",
          description: apt.citizenName
            ? `Buerger: ${apt.citizenName}`
            : undefined,
          location: locationStr || undefined,
          url: `${process.env.PUBLIC_URL || "https://termin.aitema.de"}/staff`,
        });
      }

      reply
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="aitema-termine-${employee.name.replace(/\s+/g, "-")}.ics"`
        )
        .header("Cache-Control", "no-cache, no-store, must-revalidate");

      return cal.toString();
    }
  );
}
