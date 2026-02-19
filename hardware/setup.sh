#!/bin/bash
# aitema|Termin - Raspberry Pi Kiosk Setup
# Ersteinrichtung fuer Aufrufanzeige und Ticketdrucker
#
# Ausfuehren: sudo bash setup.sh
#
set -euo pipefail

echo "=== aitema|Termin - Raspberry Pi Setup ==="
echo ""

# Check root
if [ "$(id -u)" -ne 0 ]; then
  echo "FEHLER: Bitte als root ausfuehren (sudo bash setup.sh)"
  exit 1
fi

# === System Update ===
echo "[1/7] System aktualisieren..."
apt-get update -qq
apt-get upgrade -y -qq

# === Install Dependencies ===
echo "[2/7] Abhaengigkeiten installieren..."
apt-get install -y -qq \
  chromium-browser \
  unclutter \
  xdotool \
  python3 \
  python3-pip \
  python3-venv \
  libusb-1.0-0

# === Python Ticket Printer ===
echo "[3/7] Ticket-Drucker einrichten..."
cd /opt/aitema-display/printer 2>/dev/null || true
if [ -d "/opt/aitema-display/printer" ]; then
  python3 -m venv /opt/aitema-display/printer/venv
  /opt/aitema-display/printer/venv/bin/pip install -r /opt/aitema-display/printer/requirements.txt
fi

# === Create Kiosk User ===
echo "[4/7] Kiosk-Benutzer anlegen..."
if ! id -u kiosk &>/dev/null; then
  useradd -m -s /bin/bash kiosk
  usermod -a -G video,audio,lp,plugdev kiosk
fi

# === Configure Autologin ===
echo "[5/7] Autologin konfigurieren..."
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/override.conf << AUTOEOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin kiosk --noclear %I \$TERM
AUTOEOF

# === Kiosk Browser Autostart ===
echo "[6/7] Kiosk-Autostart konfigurieren..."

KIOSK_URL="${1:-http://localhost:8080/kiosk/index.html?tenant=demo&location=default}"

mkdir -p /home/kiosk/.config/autostart

cat > /home/kiosk/.xinitrc << XINITEOF
#!/bin/bash
# Disable screen saver and power management
xset s off
xset s noblank
xset -dpms

# Hide mouse cursor after 3 seconds
unclutter -idle 3 -root &

# Wait for network
sleep 5

# Start Chromium in kiosk mode
chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-features=TranslateUI \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --check-for-update-interval=31536000 \\
  --autoplay-policy=no-user-gesture-required \\
  "${KIOSK_URL}"
XINITEOF

chmod +x /home/kiosk/.xinitrc

# Auto-start X on login
cat > /home/kiosk/.bash_profile << BPEOF
if [ -z "\$DISPLAY" ] && [ "\$(tty)" = "/dev/tty1" ]; then
  startx
fi
BPEOF

chown -R kiosk:kiosk /home/kiosk/

# === USB Printer Permissions ===
echo "[7/7] USB-Drucker Berechtigungen..."
cat > /etc/udev/rules.d/99-thermal-printer.rules << UDEVEOF
# Epson TM-T20
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666", GROUP="lp"
# Star TSP
SUBSYSTEM=="usb", ATTR{idVendor}=="0519", MODE="0666", GROUP="lp"
# Custom (generic)
SUBSYSTEM=="usb", ATTR{idVendor}=="0dd4", MODE="0666", GROUP="lp"
UDEVEOF

udevadm control --reload-rules

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "Konfiguration:"
echo "  Kiosk-URL: ${KIOSK_URL}"
echo "  Benutzer:  kiosk"
echo "  Autostart: Ja (nach Neustart)"
echo ""
echo "Naechste Schritte:"
echo "  1. URL anpassen: nano /home/kiosk/.xinitrc"
echo "  2. Drucker testen: python3 printer/ticket-printer.py --test"
echo "  3. Neustart: sudo reboot"
echo ""
