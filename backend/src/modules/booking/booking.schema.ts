import { z } from "zod";

export const getAvailableSlotsSchema = z.object({
  serviceId: z.string().cuid(),
  locationId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  resourceId: z.string().cuid().optional(),
});

export const getAvailableDaysSchema = z.object({
  serviceId: z.string().cuid(),
  locationId: z.string().cuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
});

export const createBookingSchema = z.object({
  serviceId: z.string().cuid(),
  locationId: z.string().cuid(),
  resourceId: z.string().cuid().optional(),
  slotStart: z.string().datetime(),
  citizenName: z.string().min(2).max(200),
  citizenEmail: z.string().email().optional(),
  citizenPhone: z.string().min(5).max(30).optional(),
  notes: z.string().max(1000).optional(),
  preferredLanguage: z.enum(["de", "en", "tr", "ar", "uk"]).default("de"),
  appointmentType: z.enum(["inperson", "video"]).default("inperson"), // D2: Video-Termin
});

export const cancelBookingSchema = z.object({
  bookingCode: z.string().min(5).max(20),
  citizenEmail: z.string().email().optional(),
  reason: z.string().max(500).optional(),
});

export const lookupBookingSchema = z.object({
  bookingCode: z.string().min(5).max(20),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;
export type GetAvailableDaysInput = z.infer<typeof getAvailableDaysSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type LookupBookingInput = z.infer<typeof lookupBookingSchema>;
