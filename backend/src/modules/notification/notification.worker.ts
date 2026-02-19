import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { getConfig } from "../../config.js";
import {
  sendEmail,
  generateBookingConfirmationEmail,
  generateCancellationEmail,
  logNotification,
} from "./notification.service.js";

const config = getConfig();

interface NotificationJob {
  tenantId: string;
  type: string;
  channel: string;
  recipient: string;
  appointmentId?: string;
  bookingCode?: string;
  data: Record<string, unknown>;
}

/**
 * Start the BullMQ notification worker.
 * Processes email/SMS notification jobs from the queue.
 */
export function startNotificationWorker() {
  const connection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<NotificationJob>(
    "notifications",
    async (job: Job<NotificationJob>) => {
      const { tenantId, type, channel, recipient, data } = job.data;

      console.log(`Processing notification: ${type} via ${channel} to ${recipient}`);

      try {
        if (channel === "EMAIL") {
          let email;

          switch (type) {
            case "BOOKING_CONFIRMATION":
              email = generateBookingConfirmationEmail(data as any);
              break;
            case "BOOKING_CANCELLATION":
              email = generateCancellationEmail(data as any);
              break;
            default:
              console.warn(`Unknown notification type: ${type}`);
              return;
          }

          email.to = recipient;
          const sent = await sendEmail(email);

          await logNotification(
            tenantId,
            type,
            channel,
            recipient,
            email.subject,
            email.text,
            sent ? "SENT" : "FAILED",
            "appointment",
            job.data.appointmentId,
            sent ? undefined : "Email send failed"
          );

          if (!sent) {
            throw new Error("Failed to send email");
          }
        }

        if (channel === "SMS") {
          // SMS integration placeholder
          console.log(`SMS sending not yet implemented. Would send to: ${recipient}`);
          await logNotification(
            tenantId,
            type,
            channel,
            recipient,
            "",
            JSON.stringify(data),
            "FAILED",
            "appointment",
            job.data.appointmentId,
            "SMS not configured"
          );
        }
      } catch (err) {
        console.error("Notification worker error:", err);
        throw err; // BullMQ will retry
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 60000, // Max 50 emails per minute
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`Notification job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
  });

  console.log("Notification worker started");
  return worker;
}
