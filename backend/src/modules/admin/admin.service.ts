import { prisma } from "../../server.js";
import type { Prisma } from "@prisma/client";

// ==================== TENANT CRUD ====================

export async function listTenants() {
  return prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { locations: true, services: true } },
    },
  });
}

export async function getTenant(id: string) {
  return prisma.tenant.findUniqueOrThrow({
    where: { id },
    include: {
      locations: { orderBy: { sortOrder: "asc" } },
      serviceCategories: { orderBy: { sortOrder: "asc" }, include: { services: true } },
    },
  });
}

export async function createTenant(data: Prisma.TenantCreateInput) {
  return prisma.tenant.create({ data });
}

export async function updateTenant(id: string, data: Prisma.TenantUpdateInput) {
  return prisma.tenant.update({ where: { id }, data });
}

// ==================== LOCATION CRUD ====================

export async function listLocations(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      openingHours: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { resources: true, appointments: true } },
    },
  });
}

export async function createLocation(
  tenantId: string,
  data: Omit<Prisma.LocationCreateInput, "tenant"> & {
    openingHours?: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      breakStart?: string;
      breakEnd?: string;
    }>;
  }
) {
  const { openingHours, ...locationData } = data;

  return prisma.location.create({
    data: {
      ...locationData,
      tenant: { connect: { id: tenantId } },
      openingHours: openingHours
        ? {
            create: openingHours.map((oh) => ({
              dayOfWeek: oh.dayOfWeek,
              openTime: oh.openTime,
              closeTime: oh.closeTime,
              breakStart: oh.breakStart,
              breakEnd: oh.breakEnd,
            })),
          }
        : undefined,
    },
    include: { openingHours: true },
  });
}

export async function updateLocation(
  id: string,
  data: Prisma.LocationUpdateInput
) {
  return prisma.location.update({ where: { id }, data });
}

// ==================== SERVICE CRUD ====================

export async function listServices(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      _count: { select: { appointments: true } },
    },
  });
}

export async function createService(
  tenantId: string,
  data: Omit<Prisma.ServiceCreateInput, "tenant">
) {
  return prisma.service.create({
    data: {
      ...data,
      tenant: { connect: { id: tenantId } },
    },
  });
}

export async function updateService(
  id: string,
  data: Prisma.ServiceUpdateInput
) {
  return prisma.service.update({ where: { id }, data });
}

export async function deleteService(id: string) {
  return prisma.service.update({ where: { id }, data: { active: false } });
}

// ==================== RESOURCE CRUD ====================

export async function listResources(tenantId: string, locationId?: string) {
  return prisma.resource.findMany({
    where: { tenantId, locationId: locationId || undefined },
    orderBy: { name: "asc" },
    include: {
      resourceServices: { include: { service: { select: { name: true } } } },
      location: { select: { name: true } },
    },
  });
}

export async function createResource(
  tenantId: string,
  data: {
    locationId: string;
    name: string;
    shortName?: string;
    type: "COUNTER" | "EMPLOYEE" | "ROOM";
    serviceIds: string[];
  }
) {
  return prisma.resource.create({
    data: {
      tenant: { connect: { id: tenantId } },
      location: { connect: { id: data.locationId } },
      name: data.name,
      shortName: data.shortName,
      type: data.type,
      resourceServices: {
        create: data.serviceIds.map((sid) => ({
          service: { connect: { id: sid } },
        })),
      },
    },
    include: {
      resourceServices: { include: { service: { select: { name: true } } } },
    },
  });
}

// ==================== STATISTICS ====================

export async function getDashboardStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalLocations,
    totalServices,
    todayAppointments,
    todayCompleted,
    todayNoShow,
    todayQueueTickets,
    avgWaitTime,
  ] = await Promise.all([
    prisma.location.count({ where: { tenantId, active: true } }),
    prisma.service.count({ where: { tenantId, active: true } }),
    prisma.appointment.count({
      where: {
        location: { tenantId },
        scheduledStart: { gte: today, lt: tomorrow },
      },
    }),
    prisma.appointment.count({
      where: {
        location: { tenantId },
        status: "COMPLETED",
        scheduledStart: { gte: today, lt: tomorrow },
      },
    }),
    prisma.appointment.count({
      where: {
        location: { tenantId },
        status: "NO_SHOW",
        scheduledStart: { gte: today, lt: tomorrow },
      },
    }),
    prisma.queueTicket.count({
      where: {
        location: { tenantId },
        issuedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.queueTicket.aggregate({
      where: {
        location: { tenantId },
        status: "COMPLETED",
        issuedAt: { gte: today, lt: tomorrow },
        calledAt: { not: null },
      },
      _avg: { estimatedWaitMinutes: true },
    }),
  ]);

  return {
    totalLocations,
    totalServices,
    today: {
      appointments: todayAppointments,
      completed: todayCompleted,
      noShow: todayNoShow,
      queueTickets: todayQueueTickets,
      avgWaitMinutes: avgWaitTime._avg.estimatedWaitMinutes ?? 0,
    },
  };
}
