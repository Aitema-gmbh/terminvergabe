import { prisma, redis, redisPub } from "../../server.js";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Queue Ticket Prefix Assignment:
 * Each service category gets a letter prefix (A, B, C, ...).
 * Within each prefix, tickets are numbered sequentially per day.
 */

const TICKET_PREFIX_MAP_KEY = "queue:prefix_map";

/**
 * Get or assign a ticket prefix for a service at a location.
 */
async function getTicketPrefix(locationId: string, serviceId: string): Promise<string> {
  const mapKey = `${TICKET_PREFIX_MAP_KEY}:${locationId}`;
  const existing = await redis.hget(mapKey, serviceId);

  if (existing) return existing;

  // Get all existing prefixes for this location
  const allPrefixes = await redis.hvals(mapKey);
  const usedLetters = new Set(allPrefixes);

  // Find next available letter
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let prefix = "A";
  for (const letter of letters) {
    if (!usedLetters.has(letter)) {
      prefix = letter;
      break;
    }
  }

  await redis.hset(mapKey, serviceId, prefix);
  return prefix;
}

/**
 * Get the next sequential ticket number for today.
 */
async function getNextTicketSeq(locationId: string, prefix: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const seqKey = `queue:seq:${locationId}:${prefix}:${today}`;
  const seq = await redis.incr(seqKey);

  // Auto-expire at midnight + 1 hour buffer
  if (seq === 1) {
    await redis.expire(seqKey, 86400 + 3600);
  }

  return seq;
}

/**
 * Issue a new queue ticket.
 */
export async function issueTicket(
  locationId: string,
  serviceId: string,
  citizenName?: string
) {
  const prefix = await getTicketPrefix(locationId, serviceId);
  const seq = await getNextTicketSeq(locationId, prefix);
  const ticketNumber = `${prefix}${String(seq).padStart(3, "0")}`;

  // Estimate wait time
  const waitingCount = await prisma.queueTicket.count({
    where: {
      locationId,
      serviceId,
      status: { in: ["WAITING", "CALLED"] },
    },
  });

  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    select: { durationMinutes: true, name: true },
  });

  const estimatedWaitMinutes = waitingCount * service.durationMinutes;

  const ticket = await prisma.queueTicket.create({
    data: {
      locationId,
      serviceId,
      ticketNumber,
      ticketPrefix: prefix,
      ticketSeq: seq,
      citizenName,
      status: "WAITING",
      priority: 0,
      estimatedWaitMinutes,
    },
    include: {
      service: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  // Publish update to all connected clients
  await publishQueueUpdate(locationId);

  return ticket;
}

/**
 * Call the next ticket in the queue.
 * Priority-based: higher priority first, then FIFO.
 */
export async function callNextTicket(
  locationId: string,
  resourceId: string,
  counterName: string
) {
  // Get the resource to check which services it handles
  const resource = await prisma.resource.findUniqueOrThrow({
    where: { id: resourceId },
    include: { resourceServices: { select: { serviceId: true } } },
  });

  const serviceIds = resource.resourceServices.map((rs) => rs.serviceId);

  // Find next waiting ticket (priority DESC, then issuedAt ASC)
  const nextTicket = await prisma.queueTicket.findFirst({
    where: {
      locationId,
      serviceId: { in: serviceIds },
      status: "WAITING",
    },
    orderBy: [
      { priority: "desc" },
      { issuedAt: "asc" },
    ],
  });

  if (!nextTicket) {
    return null;
  }

  // Mark any currently "CALLED" ticket for this resource as NO_SHOW
  await prisma.queueTicket.updateMany({
    where: {
      servingResourceId: resourceId,
      status: "CALLED",
    },
    data: {
      status: "NO_SHOW",
    },
  });

  // Update the ticket
  const calledTicket = await prisma.queueTicket.update({
    where: { id: nextTicket.id },
    data: {
      status: "CALLED",
      calledAt: new Date(),
      servingResourceId: resourceId,
      counterName,
    },
    include: {
      service: { select: { name: true } },
    },
  });

  // Publish to display and queue channels
  await publishQueueUpdate(locationId);
  await publishDisplayCall(locationId, {
    ticketNumber: calledTicket.ticketNumber,
    counterName,
    serviceName: calledTicket.service.name,
  });

  return calledTicket;
}

/**
 * Mark a called ticket as being served.
 */
export async function startServing(ticketId: string) {
  const ticket = await prisma.queueTicket.update({
    where: { id: ticketId },
    data: {
      status: "IN_SERVICE",
      servedAt: new Date(),
    },
  });

  await publishQueueUpdate(ticket.locationId);
  return ticket;
}

/**
 * Mark a ticket as completed.
 */
export async function completeTicket(ticketId: string) {
  const ticket = await prisma.queueTicket.update({
    where: { id: ticketId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await publishQueueUpdate(ticket.locationId);
  return ticket;
}

/**
 * Get current queue status for a location.
 */
export async function getQueueStatus(locationId: string) {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [waiting, called, inService, completed, tickets] = await Promise.all([
    prisma.queueTicket.count({
      where: { locationId, status: "WAITING", issuedAt: { gte: today, lte: todayEnd } },
    }),
    prisma.queueTicket.count({
      where: { locationId, status: "CALLED", issuedAt: { gte: today, lte: todayEnd } },
    }),
    prisma.queueTicket.count({
      where: { locationId, status: "IN_SERVICE", issuedAt: { gte: today, lte: todayEnd } },
    }),
    prisma.queueTicket.count({
      where: { locationId, status: "COMPLETED", issuedAt: { gte: today, lte: todayEnd } },
    }),
    prisma.queueTicket.findMany({
      where: {
        locationId,
        status: { in: ["WAITING", "CALLED", "IN_SERVICE"] },
        issuedAt: { gte: today, lte: todayEnd },
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { issuedAt: "asc" }],
    }),
  ]);

  return {
    summary: {
      waiting,
      called,
      inService,
      completed,
      total: waiting + called + inService + completed,
    },
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      serviceName: t.service.name,
      counterName: t.counterName,
      citizenName: t.citizenName,
      estimatedWaitMinutes: t.estimatedWaitMinutes,
      issuedAt: t.issuedAt,
      calledAt: t.calledAt,
    })),
  };
}

/**
 * Publish queue update via Redis PubSub.
 */
async function publishQueueUpdate(locationId: string) {
  const status = await getQueueStatus(locationId);
  await redisPub.publish(
    `queue:${locationId}`,
    JSON.stringify({ type: "QUEUE_UPDATE", data: status })
  );
}

/**
 * Publish display call event (ticket called to counter).
 */
async function publishDisplayCall(
  locationId: string,
  call: { ticketNumber: string; counterName: string; serviceName: string }
) {
  await redisPub.publish(
    `display:${locationId}`,
    JSON.stringify({ type: "TICKET_CALLED", data: call })
  );
}
