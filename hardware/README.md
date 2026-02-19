# aitema|Termin - Hardware (Raspberry Pi)

## Aufrufanzeige (Kiosk-Display)

### Hardware-Anforderungen
- Raspberry Pi 4 (2GB+ RAM empfohlen)
- HDMI-Display (Full HD 1920x1080)
- Netzwerkanbindung (LAN empfohlen)
- Optional: Lautsprecher fuer Aufrufsignal

### Einrichtung

```bash
# 1. Dateien auf den Pi kopieren
scp -r hardware/ pi@raspberrypi:/opt/aitema-display/

# 2. Setup ausfuehren
ssh pi@raspberrypi
cd /opt/aitema-display
sudo bash setup.sh "http://BACKEND_IP:3000/kiosk/index.html?tenant=TENANT&location=LOCATION_ID"

# 3. Neustart
sudo reboot
```

### URL-Parameter
- `server`: WebSocket Server URL (z.B. `ws://192.168.1.100:3000`)
- `tenant`: Mandanten-Slug
- `location`: Standort-ID
- `device`: Geraete-ID (optional, wird automatisch generiert)

## Thermodrucker

### Kompatible Drucker
- Epson TM-T20II/III
- Star TSP100/TSP650
- Bixolon SRP-330III
- Jeder ESC/POS-kompatible 80mm Drucker

### Einrichtung

```bash
# Python-Umgebung
cd /opt/aitema-display/printer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Testdruck (USB)
python3 ticket-printer.py --test

# Netzwerkdrucker
python3 ticket-printer.py --connection network --host 192.168.1.200 --test
```

### Druckmodi
- `--connection usb`: USB-Verbindung (Standard)
- `--connection network`: Netzwerk (IP:9100)
- `--connection serial`: Seriell (/dev/ttyUSB0)

### Ticket-Druck via API
```bash
echo '{"ticketNumber":"A001","serviceName":"Personalausweis","locationName":"Rathaus","waitingCount":3}' | python3 ticket-printer.py --connection usb
```
