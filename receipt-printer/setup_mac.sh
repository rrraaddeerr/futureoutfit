#!/usr/bin/env bash
# One-time setup for the Film Set Receipt Printer on macOS.
# Usage:  bash setup_mac.sh
set -e

echo "==> Film Set Receipt Printer — macOS setup"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Install it from https://brew.sh first."
  exit 1
fi

echo "==> Installing libusb (for USB access)…"
brew list libusb >/dev/null 2>&1 || brew install libusb

echo "==> Making sure Python 3 + Tk are present…"
if ! command -v python3 >/dev/null 2>&1; then
  brew install python
fi
brew list python-tk >/dev/null 2>&1 || brew install python-tk || true

echo "==> Installing Python packages…"
python3 -m pip install --user --upgrade -r "$(dirname "$0")/requirements.txt"

echo ""
echo "Setup complete!  Now run:"
echo "    python3 $(dirname "$0")/receipt_printer.py"
echo ""
echo "If the GUI cannot find your printer, click 'USB Settings…' inside"
echo "the app to pick it from the list of connected USB devices."
