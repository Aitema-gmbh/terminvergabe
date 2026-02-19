#!/usr/bin/env python3
"""
aitema|Termin - Thermodrucker Ticket-Ausgabe
ESC/POS Ansteuerung fuer Warteschlangen-Tickets.

Kompatibel mit gaengigen 80mm Thermodruckern (Epson TM-T20, Star TSP, etc.)
"""

import sys
import json
import argparse
from datetime import datetime

try:
    from escpos.printer import Usb, Network, Serial
except ImportError:
    print("FEHLER: python-escpos nicht installiert.")
    print("Installation: pip install python-escpos")
    sys.exit(1)


def get_printer(connection_type: str, **kwargs):
    """Initialize the printer connection."""
    if connection_type == "usb":
        vendor_id = kwargs.get("vendor_id", 0x04b8)  # Epson default
        product_id = kwargs.get("product_id", 0x0202)
        return Usb(vendor_id, product_id)
    elif connection_type == "network":
        host = kwargs.get("host", "192.168.1.100")
        port = kwargs.get("port", 9100)
        return Network(host, port=port)
    elif connection_type == "serial":
        devfile = kwargs.get("devfile", "/dev/ttyUSB0")
        return Serial(devfile)
    else:
        raise ValueError(f"Unbekannter Verbindungstyp: {connection_type}")


def print_queue_ticket(
    printer,
    ticket_number: str,
    service_name: str,
    location_name: str,
    waiting_count: int = 0,
    estimated_wait: int = 0,
):
    """Print a queue ticket on the thermal printer."""

    now = datetime.now()
    date_str = now.strftime("%d.%m.%Y")
    time_str = now.strftime("%H:%M")

    # Header
    printer.set(align="center", bold=True, width=2, height=2)
    printer.text("aitema|Termin\n")

    printer.set(align="center", bold=False, width=1, height=1)
    printer.text(f"{location_name}\n")
    printer.text(f"{date_str}  {time_str}\n")

    printer.text("-" * 32 + "\n")

    # Ticket Number (large)
    printer.set(align="center", bold=True, width=4, height=4)
    printer.text(f"{ticket_number}\n")

    printer.set(align="center", bold=False, width=1, height=1)
    printer.text("-" * 32 + "\n")

    # Service
    printer.set(align="center", bold=True, width=1, height=2)
    printer.text(f"{service_name}\n\n")

    # Wait info
    printer.set(align="center", bold=False, width=1, height=1)
    if waiting_count > 0:
        printer.text(f"Vor Ihnen: {waiting_count} Personen\n")
    if estimated_wait > 0:
        printer.text(f"Geschaetzte Wartezeit: ca. {estimated_wait} Min.\n")

    printer.text("\n")

    # Footer
    printer.set(align="center", bold=False, width=1, height=1)
    printer.text("Bitte warten Sie im Wartebereich\n")
    printer.text("bis Ihre Nummer aufgerufen wird.\n")
    printer.text("\n")
    printer.text("Bitte beachten Sie die Anzeige!\n")

    # QR Code with ticket info
    printer.text("\n")
    printer.qr(
        f"https://termin.example.de/status?ticket={ticket_number}",
        size=6,
        center=True,
    )
    printer.text("Status online verfolgen\n")

    # Cut
    printer.text("\n\n")
    printer.cut()


def print_appointment_ticket(
    printer,
    booking_code: str,
    citizen_name: str,
    service_name: str,
    location_name: str,
    scheduled_time: str,
):
    """Print an appointment check-in ticket."""

    now = datetime.now()

    printer.set(align="center", bold=True, width=2, height=2)
    printer.text("aitema|Termin\n")

    printer.set(align="center", bold=False, width=1, height=1)
    printer.text(f"{location_name}\n")
    printer.text("-" * 32 + "\n\n")

    printer.set(align="center", bold=True, width=1, height=2)
    printer.text("TERMIN CHECK-IN\n\n")

    printer.set(align="left", bold=False, width=1, height=1)
    printer.text(f"Name:    {citizen_name}\n")
    printer.text(f"Dienst:  {service_name}\n")
    printer.text(f"Termin:  {scheduled_time}\n")
    printer.text(f"Code:    {booking_code}\n")

    printer.text("\n")
    printer.set(align="center")
    printer.text("Sie wurden eingecheckt.\n")
    printer.text("Bitte warten Sie auf Ihren Aufruf.\n")

    printer.text("\n\n")
    printer.cut()


def main():
    parser = argparse.ArgumentParser(description="aitema|Termin Ticket-Drucker")
    parser.add_argument(
        "--connection",
        choices=["usb", "network", "serial"],
        default="usb",
        help="Verbindungstyp (Standard: usb)",
    )
    parser.add_argument("--host", default="192.168.1.100", help="Netzwerk-Drucker IP")
    parser.add_argument("--port", type=int, default=9100, help="Netzwerk-Drucker Port")
    parser.add_argument("--vendor-id", type=lambda x: int(x, 16), default=0x04B8)
    parser.add_argument("--product-id", type=lambda x: int(x, 16), default=0x0202)
    parser.add_argument("--devfile", default="/dev/ttyUSB0", help="Serieller Port")
    parser.add_argument("--test", action="store_true", help="Testticket drucken")
    parser.add_argument(
        "--json",
        type=str,
        help="Ticket-Daten als JSON-String",
    )

    args = parser.parse_args()

    printer = get_printer(
        args.connection,
        host=args.host,
        port=args.port,
        vendor_id=args.vendor_id,
        product_id=args.product_id,
        devfile=args.devfile,
    )

    if args.test:
        print_queue_ticket(
            printer,
            ticket_number="A001",
            service_name="Personalausweis beantragen",
            location_name="Buergerbuero Musterstadt",
            waiting_count=3,
            estimated_wait=15,
        )
        print("Testticket gedruckt!")
        return

    if args.json:
        data = json.loads(args.json)
        if data.get("type") == "appointment":
            print_appointment_ticket(
                printer,
                booking_code=data["bookingCode"],
                citizen_name=data["citizenName"],
                service_name=data["serviceName"],
                location_name=data["locationName"],
                scheduled_time=data["scheduledTime"],
            )
        else:
            print_queue_ticket(
                printer,
                ticket_number=data["ticketNumber"],
                service_name=data.get("serviceName", ""),
                location_name=data.get("locationName", ""),
                waiting_count=data.get("waitingCount", 0),
                estimated_wait=data.get("estimatedWait", 0),
            )
        print("Ticket gedruckt!")
        return

    # Read from stdin (pipe mode)
    for line in sys.stdin:
        try:
            data = json.loads(line.strip())
            print_queue_ticket(
                printer,
                ticket_number=data["ticketNumber"],
                service_name=data.get("serviceName", ""),
                location_name=data.get("locationName", ""),
                waiting_count=data.get("waitingCount", 0),
                estimated_wait=data.get("estimatedWait", 0),
            )
        except json.JSONDecodeError:
            print(f"Ungueltige JSON-Eingabe: {line.strip()}", file=sys.stderr)
        except Exception as e:
            print(f"Druckfehler: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
