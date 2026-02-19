/**
 * aitema|Termin - Statistics & Capacity Management Service
 *
 * Provides analytics and reporting:
 * - Daily/weekly statistics
 * - Capacity forecasting (simple moving average)
 * - Service and employee analytics
 * - Wait time distribution
 * - CSV export
 */
import { prisma } from "../server.js";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, format } from "date-fns";
import { de } from "date-fns/locale";

// ============================================================
// Types
// ============================================================

export interface DailyStats {
  date: string;
  totalAppointments: number;
  walkIns: number;
  noShows: number;
  completed: number;
  cancelled: number;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
  peakHour: number;
  hourlyBreakdown: { hour: number; count: number }[];
}

export interface WeeklyReport {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalAppointments: number;
  totalWalkIns: number;
  totalNoShows: number;
  noShowRate: number;
  avgDailyAppointments: number;
  avgWaitMinutes: number;
  peakDay: string;
  peakDayCount: number;
  valleyDay: string;
  valleyDayCount: number;
  dailyBreakdown: { date: string; dayName: string; count: number }[];
}

export interface CapacityForecast {
  date: string;
  predictedAppointments: number;
  predictedWalkIns: number;
  confidence: number;
  historicalAvg: number;
}

export interface ServiceAnalytics {
  serviceId: string;
  serviceName: string;
  category: string;
  totalCount: number;
  avgDurationMinutes: number;
  avgWaitMinutes: number;
  percentageOfTotal: number;
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  totalServed: number;
  avgServiceMinutes: number;
  avgWaitMinutes: number;
  completionRate: number;
}

export interface WaitTimeBucket {
  label: string;
  minMinutes: number;
  maxMinutes: number;
  count: number;
  percentage: number;
}

// ============================================================
// Daily Stats
// ============================================================

/**
 * Get detailed statistics for a single day.
 */
export async function getDailyStats(
  tenantId: string,
  locationId: string,
  date: Date
): Promise<DailyStats> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dateStr = format(date, "yyyy-MM-dd");

  const baseWhere = {
    tenantId,
    locationId,
    createdAt: { gte: dayStart, lte: dayEnd },
  };

  // Parallel queries for efficiency
  const [appointments, walkIns, waitTimes, hourlyRaw] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.queueTicket.count({
      where: {
        locationId,
        issuedAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.queueTicket.findMany({
      where: {
        locationId,
        status: "COMPLETED",
        issuedAt: { gte: dayStart, lte: dayEnd },
        calledAt: { not: null },
      },
      select: { issuedAt: true, calledAt: true, servedAt: true, completedAt: true },
    }),
    prisma.appointment.findMany({
      where: baseWhere,
      select: { startTime: true },
    }),
  ]);

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const row of appointments) {
    statusCounts[row.status] = row._count.id;
  }

  const totalAppointments = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const noShows = statusCounts["NO_SHOW"] || 0;
  const completed = statusCounts["COMPLETED"] || 0;
  const cancelled = statusCounts["CANCELLED"] || 0;

  // Calculate average wait and service times
  let totalWaitMs = 0;
  let totalServiceMs = 0;
  let waitCount = 0;
  let serviceCount = 0;

  for (const t of waitTimes) {
    if (t.calledAt && t.issuedAt) {
      totalWaitMs += new Date(t.calledAt).getTime() - new Date(t.issuedAt).getTime();
      waitCount++;
    }
    if (t.completedAt && t.servedAt) {
      totalServiceMs += new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime();
      serviceCount++;
    }
  }

  const avgWaitMinutes = waitCount > 0 ? Math.round(totalWaitMs / waitCount / 60000) : 0;
  const avgServiceMinutes = serviceCount > 0 ? Math.round(totalServiceMs / serviceCount / 60000) : 0;

  // Hourly breakdown
  const hourBuckets = new Array(24).fill(0);
  for (const apt of hourlyRaw) {
    const hour = new Date(apt.startTime).getHours();
    hourBuckets[hour]++;
  }

  const hourlyBreakdown = hourBuckets.map((count, hour) => ({ hour, count }));
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  return {
    date: dateStr,
    totalAppointments,
    walkIns,
    noShows,
    completed,
    cancelled,
    avgWaitMinutes,
    avgServiceMinutes,
    peakHour,
    hourlyBreakdown: hourlyBreakdown.filter((h) => h.count > 0),
  };
}

// ============================================================
// Weekly Report
// ============================================================

/**
 * Get a weekly aggregated report.
 */
export async function getWeeklyReport(
  tenantId: string,
  locationId: string,
  weekStart: Date
): Promise<WeeklyReport> {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  const dailyBreakdown: { date: string; dayName: string; count: number }[] = [];
  let totalAppointments = 0;
  let totalWalkIns = 0;
  let totalNoShows = 0;
  let totalWaitMs = 0;
  let waitCount = 0;

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    const [aptCount, walkInCount, noShowCount, waitData] = await Promise.all([
      prisma.appointment.count({
        where: { tenantId, locationId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.queueTicket.count({
        where: { locationId, issuedAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.appointment.count({
        where: { tenantId, locationId, status: "NO_SHOW", createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.queueTicket.findMany({
        where: {
          locationId,
          status: "COMPLETED",
          issuedAt: { gte: dayStart, lte: dayEnd },
          calledAt: { not: null },
        },
        select: { issuedAt: true, calledAt: true },
      }),
    ]);

    for (const t of waitData) {
      if (t.calledAt && t.issuedAt) {
        totalWaitMs += new Date(t.calledAt).getTime() - new Date(t.issuedAt).getTime();
        waitCount++;
      }
    }

    const dayName = format(day, "EEEE", { locale: de });
    dailyBreakdown.push({
      date: format(day, "yyyy-MM-dd"),
      dayName,
      count: aptCount + walkInCount,
    });

    totalAppointments += aptCount;
    totalWalkIns += walkInCount;
    totalNoShows += noShowCount;
  }

  const peakEntry = dailyBreakdown.reduce((a, b) => (a.count >= b.count ? a : b));
  const valleyEntry = dailyBreakdown.reduce((a, b) => (a.count <= b.count ? a : b));
  const totalAll = totalAppointments + totalWalkIns;

  return {
    weekLabel: `KW ${format(start, "ww", { locale: de })}`,
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    totalAppointments,
    totalWalkIns,
    totalNoShows,
    noShowRate: totalAppointments > 0 ? Math.round((totalNoShows / totalAppointments) * 100) : 0,
    avgDailyAppointments: Math.round(totalAll / 7),
    avgWaitMinutes: waitCount > 0 ? Math.round(totalWaitMs / waitCount / 60000) : 0,
    peakDay: peakEntry.dayName,
    peakDayCount: peakEntry.count,
    valleyDay: valleyEntry.dayName,
    valleyDayCount: valleyEntry.count,
    dailyBreakdown,
  };
}

// ============================================================
// Capacity Forecast (Simple Moving Average)
// ============================================================

/**
 * Forecast expected appointments for upcoming days
 * using a simple moving average over the last N weeks (same weekday).
 */
export async function getCapacityForecast(
  tenantId: string,
  locationId: string,
  forecastDays: number = 14,
  lookbackWeeks: number = 4
): Promise<CapacityForecast[]> {
  const forecasts: CapacityForecast[] = [];
  const today = new Date();

  for (let d = 0; d < forecastDays; d++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + d);

    // Collect same-weekday data from past weeks
    const historicalCounts: number[] = [];
    const historicalWalkIns: number[] = [];

    for (let w = 1; w <= lookbackWeeks; w++) {
      const pastDate = subDays(targetDate, w * 7);
      const pastStart = startOfDay(pastDate);
      const pastEnd = endOfDay(pastDate);

      const [aptCount, walkInCount] = await Promise.all([
        prisma.appointment.count({
          where: { tenantId, locationId, createdAt: { gte: pastStart, lte: pastEnd } },
        }),
        prisma.queueTicket.count({
          where: { locationId, issuedAt: { gte: pastStart, lte: pastEnd } },
        }),
      ]);

      historicalCounts.push(aptCount);
      historicalWalkIns.push(walkInCount);
    }

    const avgAppointments =
      historicalCounts.length > 0
        ? Math.round(historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length)
        : 0;

    const avgWalkIns =
      historicalWalkIns.length > 0
        ? Math.round(historicalWalkIns.reduce((a, b) => a + b, 0) / historicalWalkIns.length)
        : 0;

    // Confidence decreases with fewer data points and further in the future
    const dataConfidence = Math.min(historicalCounts.length / lookbackWeeks, 1);
    const timeDecay = Math.max(1 - d * 0.03, 0.3);
    const confidence = Math.round(dataConfidence * timeDecay * 100) / 100;

    forecasts.push({
      date: format(targetDate, "yyyy-MM-dd"),
      predictedAppointments: avgAppointments,
      predictedWalkIns: avgWalkIns,
      confidence,
      historicalAvg: avgAppointments + avgWalkIns,
    });
  }

  return forecasts;
}

// ============================================================
// Service Analytics
// ============================================================

/**
 * Analyze performance by service type.
 */
export async function getServiceAnalytics(
  tenantId: string,
  locationId: string,
  from: Date,
  to: Date
): Promise<ServiceAnalytics[]> {
  const dayStart = startOfDay(from);
  const dayEnd = endOfDay(to);

  const tickets = await prisma.queueTicket.findMany({
    where: {
      locationId,
      issuedAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      service: { select: { id: true, name: true, category: true, durationMinutes: true } },
    },
  });

  const serviceMap = new Map<
    string,
    {
      serviceId: string;
      serviceName: string;
      category: string;
      count: number;
      totalWaitMs: number;
      totalServiceMs: number;
      waitEntries: number;
      serviceEntries: number;
    }
  >();

  for (const t of tickets) {
    const key = t.serviceId;
    if (!serviceMap.has(key)) {
      serviceMap.set(key, {
        serviceId: t.serviceId,
        serviceName: t.service.name,
        category: t.service.category || "Sonstiges",
        count: 0,
        totalWaitMs: 0,
        totalServiceMs: 0,
        waitEntries: 0,
        serviceEntries: 0,
      });
    }

    const entry = serviceMap.get(key)!;
    entry.count++;

    if (t.calledAt && t.issuedAt) {
      entry.totalWaitMs += new Date(t.calledAt).getTime() - new Date(t.issuedAt).getTime();
      entry.waitEntries++;
    }
    if (t.completedAt && t.servedAt) {
      entry.totalServiceMs +=
        new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime();
      entry.serviceEntries++;
    }
  }

  const totalAll = tickets.length || 1;

  return Array.from(serviceMap.values())
    .map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      category: s.category,
      totalCount: s.count,
      avgDurationMinutes:
        s.serviceEntries > 0 ? Math.round(s.totalServiceMs / s.serviceEntries / 60000) : 0,
      avgWaitMinutes:
        s.waitEntries > 0 ? Math.round(s.totalWaitMs / s.waitEntries / 60000) : 0,
      percentageOfTotal: Math.round((s.count / totalAll) * 100),
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

// ============================================================
// Employee Stats
// ============================================================

/**
 * Get performance statistics per employee/resource.
 */
export async function getEmployeeStats(
  tenantId: string,
  locationId: string,
  from: Date,
  to: Date
): Promise<EmployeeStats[]> {
  const dayStart = startOfDay(from);
  const dayEnd = endOfDay(to);

  const tickets = await prisma.queueTicket.findMany({
    where: {
      locationId,
      status: { in: ["COMPLETED", "IN_SERVICE"] },
      servedAt: { gte: dayStart, lte: dayEnd },
      servingResourceId: { not: null },
    },
    include: {
      servingResource: { select: { id: true, name: true } },
    },
  });

  const empMap = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
      completed: number;
      totalServiceMs: number;
      serviceEntries: number;
    }
  >();

  for (const t of tickets) {
    if (!t.servingResourceId || !t.servingResource) continue;

    const key = t.servingResourceId;
    if (!empMap.has(key)) {
      empMap.set(key, {
        id: t.servingResourceId,
        name: t.servingResource.name,
        total: 0,
        completed: 0,
        totalServiceMs: 0,
        serviceEntries: 0,
      });
    }

    const entry = empMap.get(key)!;
    entry.total++;

    if (t.status === "COMPLETED") {
      entry.completed++;
    }
    if (t.completedAt && t.servedAt) {
      entry.totalServiceMs +=
        new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime();
      entry.serviceEntries++;
    }
  }

  return Array.from(empMap.values())
    .map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      totalServed: e.total,
      avgServiceMinutes:
        e.serviceEntries > 0 ? Math.round(e.totalServiceMs / e.serviceEntries / 60000) : 0,
      avgWaitMinutes: 0,
      completionRate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
    }))
    .sort((a, b) => b.totalServed - a.totalServed);
}

// ============================================================
// CSV Export
// ============================================================

/**
 * Export statistics as CSV string.
 */
export async function exportCSV(
  tenantId: string,
  locationId: string,
  from: Date,
  to: Date
): Promise<string> {
  const dayStart = startOfDay(from);
  const dayEnd = endOfDay(to);

  const tickets = await prisma.queueTicket.findMany({
    where: {
      locationId,
      issuedAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      service: { select: { name: true, category: true } },
      servingResource: { select: { name: true } },
    },
    orderBy: { issuedAt: "asc" },
  });

  const headers = [
    "Datum",
    "Uhrzeit",
    "Ticketnummer",
    "Dienstleistung",
    "Kategorie",
    "Status",
    "Wartezeit (Min)",
    "Bedienzeit (Min)",
    "Mitarbeiter",
  ];

  const rows = tickets.map((t) => {
    const issuedDate = format(new Date(t.issuedAt), "dd.MM.yyyy");
    const issuedTime = format(new Date(t.issuedAt), "HH:mm");

    let waitMin = "";
    if (t.calledAt && t.issuedAt) {
      waitMin = String(
        Math.round(
          (new Date(t.calledAt).getTime() - new Date(t.issuedAt).getTime()) / 60000
        )
      );
    }

    let serviceMin = "";
    if (t.completedAt && t.servedAt) {
      serviceMin = String(
        Math.round(
          (new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime()) / 60000
        )
      );
    }

    return [
      issuedDate,
      issuedTime,
      t.ticketNumber,
      t.service.name,
      t.service.category || "",
      t.status,
      waitMin,
      serviceMin,
      t.servingResource?.name || "",
    ];
  });

  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  // BOM for Excel UTF-8 compatibility
  return "\uFEFF" + csvLines.join("\r\n");
}

// ============================================================
// Wait Time Distribution
// ============================================================

const WAIT_TIME_BUCKETS = [
  { label: "0-5 Min", min: 0, max: 5 },
  { label: "5-15 Min", min: 5, max: 15 },
  { label: "15-30 Min", min: 15, max: 30 },
  { label: "30-60 Min", min: 30, max: 60 },
  { label: "60+ Min", min: 60, max: Infinity },
];

/**
 * Get wait time distribution in predefined buckets.
 */
export async function getWaitTimeDistribution(
  tenantId: string,
  locationId: string,
  from: Date,
  to: Date
): Promise<WaitTimeBucket[]> {
  const dayStart = startOfDay(from);
  const dayEnd = endOfDay(to);

  const tickets = await prisma.queueTicket.findMany({
    where: {
      locationId,
      status: { in: ["COMPLETED", "IN_SERVICE", "CALLED"] },
      issuedAt: { gte: dayStart, lte: dayEnd },
      calledAt: { not: null },
    },
    select: { issuedAt: true, calledAt: true },
  });

  const bucketCounts = new Array(WAIT_TIME_BUCKETS.length).fill(0);

  for (const t of tickets) {
    if (!t.calledAt || !t.issuedAt) continue;
    const waitMin =
      (new Date(t.calledAt).getTime() - new Date(t.issuedAt).getTime()) / 60000;

    for (let i = 0; i < WAIT_TIME_BUCKETS.length; i++) {
      if (waitMin >= WAIT_TIME_BUCKETS[i].min && waitMin < WAIT_TIME_BUCKETS[i].max) {
        bucketCounts[i]++;
        break;
      }
    }
  }

  const total = bucketCounts.reduce((a, b) => a + b, 0) || 1;

  return WAIT_TIME_BUCKETS.map((bucket, i) => ({
    label: bucket.label,
    minMinutes: bucket.min,
    maxMinutes: bucket.max === Infinity ? -1 : bucket.max,
    count: bucketCounts[i],
    percentage: Math.round((bucketCounts[i] / total) * 100),
  }));
}
