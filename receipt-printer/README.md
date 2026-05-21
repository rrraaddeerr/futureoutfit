# Film Set Receipt Printer

A super-simple desktop app for printing custom prop receipts on a USB thermal
receipt printer — no POS software required. Designed for the kind of generic
80mm ESC/POS printer you see on set (Xprinter / POS-80 / Epson TM-T20 / Star
TSP100 / etc.).

![preview](docs/preview.png)

## What it does

- Type in store name, address, phone, items, prices, tax, server, etc.
- Live preview pane shows exactly what will print, as you type.
- One click sends the receipt to the printer over USB.
- Saves your favorite "store" defaults so the next receipt starts pre-filled.
- Save/load receipt templates as JSON files (handy for keeping a few different
  "businesses" on hand for the day).

## Quick start (macOS)

1. **Plug the printer in.** Connect both the power brick (24V barrel jack)
   and the USB cable to your Mac.
2. **Run the setup script** (one time only):
   ```bash
   cd receipt-printer
   bash setup_mac.sh
   ```
   This installs `libusb`, Tkinter, `python-escpos`, and `pyusb`.
3. **Launch the app:**
   ```bash
   python3 receipt_printer.py
   ```
4. **First print:**
   - Click **USB Settings…** at the bottom right.
   - Click **↻ Refresh USB list** — your printer should appear in the list
     (any line marked with ★ is a recognized printer; otherwise look for
     a device that disappears when you unplug the printer).
   - Select it, click **Use Selected →**, then **Save**.
   - Fill in your receipt and click **🖨 PRINT RECEIPT**.

After the first successful print, the app remembers your printer's USB IDs;
future prints work with a single click.

## Manual setup (if `setup_mac.sh` doesn't work)

```bash
brew install libusb python-tk
pip3 install --user python-escpos pyusb
python3 receipt_printer.py
```

## Troubleshooting

**"No backend available" / "USB backend not found"**
You need libusb. Run: `brew install libusb`

**"Resource busy" or print silently fails on macOS**
macOS may have claimed the printer as a system printer. Open *System
Settings → Printers & Scanners* and remove any entry for this printer, then
try again.

**"Permission denied" on USB**
Try running with `sudo`:
```bash
sudo python3 receipt_printer.py
```

**The preview looks right but nothing prints**
- Check the printer's `POWER` LED is on and `ERROR` is off.
- Make sure paper is loaded (the `PAPER` LED indicates low paper).
- Press the `FEED` button to confirm the printer itself is working.
- Try the **USB Settings…** dialog and pick a different device.

**My printer isn't in the auto-detect list**
That's fine — it just means we haven't pre-listed its USB ID. Use
**USB Settings…**, find the printer in the list (it'll appear when you plug
it in and disappear when you unplug it), and click **Use Selected →**. Once
saved, the app will use those IDs from then on.

## What's printed

The receipt has:

- Big centered store name
- Address (2 lines) + phone, centered
- Date + time on one line, server + order # on the next
- Items (qty × name … price), right-aligned prices
- Subtotal, tax line, and a big bold TOTAL
- Payment method + tendered amount, with change if applicable
- Footer text, centered (e.g. "Thank you for dining with us!")
- Feeds extra paper and cuts (if the printer supports auto-cut)

Paper width is set to 80mm / 42 characters per line. Edit `CHARS_PER_LINE`
near the top of `receipt_printer.py` if you have a 58mm printer (use `32`).

## Files

| File | What it is |
|---|---|
| `receipt_printer.py` | The whole app (GUI + print logic). |
| `requirements.txt` | Python package list (`python-escpos`, `pyusb`). |
| `setup_mac.sh` | One-shot installer for macOS. |
| `~/.film_receipt_printer.json` | Where your defaults & printer USB IDs are saved. |
