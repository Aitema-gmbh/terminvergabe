/**
 * WebSocket Service for Real-Time Updates
 * 
 * Provides real-time updates for:
 * - Queue display boards (Aufrufanzeige)
 * - Staff dashboard (new check-ins, queue changes)
 * - Citizen waiting status
 */
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

interface WSClient {
  ws: WebSocket;
  tenantId: string;
  locationId: string;
  channel: 'display' | 'staff' | 'citizen';
  ticketNumber?: string;
}

class WebSocketService {
  private clients: Map<string, WSClient> = new Map();

  register(app: FastifyInstance): void {
    app.get('/ws/:tenantId/:locationId/:channel', { websocket: true }, (connection, req) => {
      const { tenantId, locationId, channel } = req.params as {
        tenantId: string;
        locationId: string;
        channel: string;
      };

      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      this.clients.set(clientId, {
        ws: connection.socket,
        tenantId,
        locationId,
        channel: channel as WSClient['channel'],
      });

      connection.socket.on('message', (msg: Buffer) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'subscribe_ticket' && data.ticketNumber) {
            const client = this.clients.get(clientId);
            if (client) {
              client.ticketNumber = data.ticketNumber;
            }
          }
        } catch {
          // Ignore invalid messages
        }
      });

      connection.socket.on('close', () => {
        this.clients.delete(clientId);
      });

      // Send initial connection confirmation
      connection.socket.send(JSON.stringify({
        type: 'connected',
        clientId,
        channel,
        timestamp: new Date().toISOString(),
      }));
    });
  }

  /**
   * Broadcast queue update to all display boards for a location.
   */
  broadcastQueueUpdate(tenantId: string, locationId: string, data: any): void {
    this.broadcast(tenantId, locationId, 'display', {
      type: 'queue_update',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast to staff dashboard when someone checks in.
   */
  broadcastCheckIn(tenantId: string, locationId: string, data: any): void {
    this.broadcast(tenantId, locationId, 'staff', {
      type: 'check_in',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify a specific citizen that their number was called.
   */
  notifyTicketCalled(tenantId: string, locationId: string, ticketNumber: string, counter: string): void {
    for (const client of this.clients.values()) {
      if (
        client.tenantId === tenantId &&
        client.locationId === locationId &&
        client.channel === 'citizen' &&
        client.ticketNumber === ticketNumber &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(JSON.stringify({
          type: 'ticket_called',
          ticketNumber,
          counter,
          timestamp: new Date().toISOString(),
        }));
      }
    }
  }

  /**
   * Broadcast a message to all clients on a specific channel.
   */
  private broadcast(tenantId: string, locationId: string, channel: string, message: any): void {
    const payload = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (
        client.tenantId === tenantId &&
        client.locationId === locationId &&
        client.channel === channel &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Get connection stats.
   */
  getStats(): { total: number; byChannel: Record<string, number> } {
    const byChannel: Record<string, number> = {};
    for (const client of this.clients.values()) {
      byChannel[client.channel] = (byChannel[client.channel] || 0) + 1;
    }
    return { total: this.clients.size, byChannel };
  }
}

export const wsService = new WebSocketService();
