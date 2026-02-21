-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- AlterTable: Add supportsVideo to Service
ALTER TABLE "Service" ADD COLUMN "supportsVideo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add appointmentType and jitsiRoomId to Appointment
ALTER TABLE "Appointment" ADD COLUMN "appointmentType" TEXT NOT NULL DEFAULT 'inperson';
ALTER TABLE "Appointment" ADD COLUMN "jitsiRoomId" TEXT;

-- CreateTable: WaitlistEntry
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredDates" JSONB,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "token" TEXT NOT NULL,
    "offeredSlotStart" TIMESTAMP(3),
    "offeredSlotEnd" TIMESTAMP(3),
    "offeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_token_key" ON "WaitlistEntry"("token");
CREATE INDEX "WaitlistEntry_tenantId_serviceId_status_idx" ON "WaitlistEntry"("tenantId", "serviceId", "status");
CREATE INDEX "WaitlistEntry_token_idx" ON "WaitlistEntry"("token");
CREATE INDEX "WaitlistEntry_expiresAt_idx" ON "WaitlistEntry"("expiresAt");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
