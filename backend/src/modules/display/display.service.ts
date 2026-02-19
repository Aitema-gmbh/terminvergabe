import { prisma, redis } from "../../server.js";

/**
 * Register or update a hardware display device.
 */
export async function registerDisplay(
  tenantId: string,
  locationId: string,
  deviceId: string,
  name: string,
  type: "QUEUE_BOARD" | "COUNTER_DISPLAY" | "INFO_SCREEN" | "CHECK_IN_KIOSK"
) {
  const display = await prisma.display.upsert({
    where: { deviceId },
    create: {
      tenantId,
      locationId,
      deviceId,
      name,
      type,
      lastSeen: new Date(),
    },
    update: {
      name,
      type,
      lastSeen: new Date(),
      active: true,
    },
  });

  return display;
}

/**
 * Heartbeat - update last seen timestamp.
 */
export async function displayHeartbeat(deviceId: string) {
  await prisma.display.update({
    where: { deviceId },
    data: { lastSeen: new Date() },
  });
}

/**
 * Get all displays for a location.
 */
export async function getDisplays(locationId: string) {
  return prisma.display.findMany({
    where: { locationId, active: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get the current display data for a queue board.
 * Returns called tickets and waiting count.
 */
export async function getQueueBoardData(locationId: string) {
  const [calledTickets, waitingCount] = await Promise.all([
    prisma.queueTicket.findMany({
      where: {
        locationId,
        status: "CALLED",
      },
      include: {
        service: { select: { name: true } },
      },
      orderBy: { calledAt: "desc" },
      take: 10,
    }),
    prisma.queueTicket.count({
      where: {
        locationId,
        status: "WAITING",
      },
    }),
  ]);

  return {
    calledTickets: calledTickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      counterName: t.counterName,
      serviceName: t.service.name,
      calledAt: t.calledAt,
    })),
    waitingCount,
    timestamp: new Date().toISOString(),
  };
}
