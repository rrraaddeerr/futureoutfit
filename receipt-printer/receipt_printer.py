#!/usr/bin/env python3
"""Film Set Receipt Printer.

Simple desktop GUI for printing custom prop receipts to any ESC/POS
compatible USB thermal printer (Epson TM, Star, Xprinter, POS-80, etc.).

Run:
    python3 receipt_printer.py

Setup on macOS (one time):
    brew install libusb python-tk
    pip3 install -r requirements.txt
"""

from __future__ import annotations

import json
import sys
import traceback
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog
    _TK_AVAILABLE = True
    _TK_ERROR: Optional[str] = None
except ImportError as _e:
    tk = None  # type: ignore
    ttk = None  # type: ignore
    messagebox = None  # type: ignore
    filedialog = None  # type: ignore
    _TK_AVAILABLE = False
    _TK_ERROR = str(_e)


# --- Constants -------------------------------------------------------------

CHARS_PER_LINE = 42  # 80mm paper at font A (default)
SETTINGS_PATH = Path.home() / ".film_receipt_printer.json"

# Common USB vendor/product IDs for ESC/POS thermal printers.
# Used for auto-detection when the user hasn't set one explicitly.
KNOWN_PRINTERS: list[tuple[int, int, str]] = [
    (0x0416, 0x5011, "Winbond / Generic"),
    (0x04b8, 0x0202, "Epson TM-T20"),
    (0x04b8, 0x0e03, "Epson TM-T88V"),
    (0x04b8, 0x0e15, "Epson TM-T88V"),
    (0x04b8, 0x0e20, "Epson TM-T20II"),
    (0x04b8, 0x0e27, "Epson TM-T88VI"),
    (0x0fe6, 0x811e, "ICS Advent / Generic Chinese"),
    (0x0fe6, 0x8800, "ICS Advent / Generic Chinese"),
    (0x1504, 0x0006, "Bixolon"),
    (0x0519, 0x0001, "Star TSP100"),
    (0x0519, 0x0003, "Star TSP650"),
    (0x6868, 0x0200, "Xprinter / Generic"),
    (0x28e9, 0x0289, "GD32 (Xprinter clone)"),
    (0x0483, 0x5743, "STMicro / Xprinter clone"),
    (0x0483, 0x5740, "STMicro / Xprinter clone"),
    (0x154f, 0x154f, "POS-8220 clone"),
    (0x1cbe, 0x0003, "Generic POS-80"),
    (0x0dd4, 0x0205, "Custom Engineering"),
]


# --- Data ------------------------------------------------------------------

@dataclass
class Item:
    qty: int = 1
    name: str = ""
    price: float = 0.0

    def line_total(self) -> float:
        return self.qty * self.price


@dataclass
class ReceiptData:
    store_name: str = "BLUE MOON DINER"
    address1: str = "123 Main Street"
    address2: str = "Los Angeles, CA 90001"
    phone: str = "(555) 867-5309"
    server: str = "Michelle"
    order_number: str = "1-152"
    table: str = ""
    when: datetime = field(default_factory=datetime.now)
    items: list[Item] = field(default_factory=list)
    tax_rate: float = 9.5  # percent
    payment_method: str = "CASH"
    tendered: Optional[float] = None  # None = exact change
    footer: str = "Thank you for dining with us!"


# --- Formatting helpers ----------------------------------------------------

def _truncate(text: str, width: int) -> str:
    return text if len(text) <= width else text[: max(0, width - 1)] + "."


def left_right(left: str, right: str, width: int = CHARS_PER_LINE) -> str:
    """Format a line with `left` left-aligned and `right` right-aligned."""
    right = str(right)
    if len(left) + len(right) + 1 > width:
        left = left[: width - len(right) - 2] + "."
    return left + " " * (width - len(left) - len(right)) + right


def center(text: str, width: int = CHARS_PER_LINE) -> str:
    text = _truncate(text, width)
    pad = (width - len(text)) // 2
    return " " * pad + text


def divider(char: str = "-", width: int = CHARS_PER_LINE) -> str:
    return char * width


# --- Receipt rendering -----------------------------------------------------

def _money(value: float) -> str:
    return f"{value:.2f}"


def build_preview(data: ReceiptData) -> str:
    """Render the receipt as plain text for the preview pane."""
    lines: list[str] = []

    if data.store_name:
        lines.append(center(data.store_name.upper()))
    if data.address1:
        lines.append(center(data.address1))
    if data.address2:
        lines.append(center(data.address2))
    if data.phone:
        lines.append(center(data.phone))
    lines.append("")

    date_left = data.when.strftime("%a %m/%d/%y")
    time_right = data.when.strftime("%I:%M%p").lstrip("0").lower()
    lines.append(left_right(date_left, time_right))

    if data.server or data.order_number:
        srv = f"Server: {data.server}" if data.server else ""
        ordr = f"Order #{data.order_number}" if data.order_number else ""
        lines.append(left_right(srv, ordr))

    if data.table:
        lines.append(f"Table: {data.table}")

    lines.append(divider("="))

    subtotal = 0.0
    for item in data.items:
        if not item.name and item.price == 0:
            continue
        item_label = f"{item.qty} {item.name}".strip()
        lines.append(left_right(item_label, _money(item.line_total())))
        subtotal += item.line_total()

    lines.append(divider("="))

    tax = subtotal * (data.tax_rate / 100.0)
    total = subtotal + tax

    lines.append(left_right("Sub Total", _money(subtotal)))
    if data.tax_rate > 0:
        lines.append(left_right(f"Tax ({data.tax_rate:g}%)", _money(tax)))
    lines.append(left_right("TOTAL", _money(total)))
    lines.append("")

    if data.payment_method:
        tendered = data.tendered if data.tendered is not None else total
        lines.append(left_right(data.payment_method.upper(), _money(tendered)))
        change = tendered - total
        if change > 0.001:
            lines.append(left_right("Change", _money(change)))

    if data.footer:
        lines.append("")
        for fline in data.footer.split("\n"):
            lines.append(center(fline.strip()))

    return "\n".join(lines)


# --- ESC/POS print ---------------------------------------------------------

def print_to_escpos(printer, data: ReceiptData) -> None:
    """Send formatted receipt to a python-escpos printer instance.

    `printer` must be any python-escpos Printer (Usb, Network, File, Dummy).
    """
    # Header (big, bold, centered)
    if data.store_name:
        printer.set(align="center", bold=True, width=2, height=2)
        printer.text(data.store_name.upper() + "\n")

    printer.set(align="center", bold=False, width=1, height=1)
    for line in (data.address1, data.address2, data.phone):
        if line:
            printer.text(line + "\n")
    printer.text("\n")

    # Date / order info
    printer.set(align="left")
    date_left = data.when.strftime("%a %m/%d/%y")
    time_right = data.when.strftime("%I:%M%p").lstrip("0").lower()
    printer.text(left_right(date_left, time_right) + "\n")

    if data.server or data.order_number:
        srv = f"Server: {data.server}" if data.server else ""
        ordr = f"Order #{data.order_number}" if data.order_number else ""
        printer.text(left_right(srv, ordr) + "\n")

    if data.table:
        printer.text(f"Table: {data.table}\n")

    printer.text(divider("=") + "\n")

    # Items
    subtotal = 0.0
    for item in data.items:
        if not item.name and item.price == 0:
            continue
        item_label = f"{item.qty} {item.name}".strip()
        printer.text(left_right(item_label, _money(item.line_total())) + "\n")
        subtotal += item.line_total()

    printer.text(divider("=") + "\n")

    tax = subtotal * (data.tax_rate / 100.0)
    total = subtotal + tax

    printer.text(left_right("Sub Total", _money(subtotal)) + "\n")
    if data.tax_rate > 0:
        printer.text(left_right(f"Tax ({data.tax_rate:g}%)", _money(tax)) + "\n")

    # Big bold TOTAL
    printer.set(bold=True, width=1, height=2)
    printer.text(left_right("TOTAL", _money(total)) + "\n")
    printer.set(bold=False, width=1, height=1)
    printer.text("\n")

    # Payment
    if data.payment_method:
        tendered = data.tendered if data.tendered is not None else total
        printer.text(
            left_right(data.payment_method.upper(), _money(tendered)) + "\n"
        )
        change = tendered - total
        if change > 0.001:
            printer.text(left_right("Change", _money(change)) + "\n")

    if data.footer:
        printer.text("\n")
        printer.set(align="center")
        for fline in data.footer.split("\n"):
            printer.text(fline.strip() + "\n")
        printer.set(align="left")

    printer.text("\n\n\n")
    try:
        printer.cut()
    except Exception:
        # Some printers don't support cut; feed extra paper instead
        printer.text("\n\n")


# --- USB helpers -----------------------------------------------------------

def detect_known_printer() -> Optional[tuple[int, int, str]]:
    """Probe USB bus for a known ESC/POS printer. Returns (vid, pid, name)."""
    try:
        import usb.core
    except ImportError:
        return None

    for vid, pid, name in KNOWN_PRINTERS:
        try:
            if usb.core.find(idVendor=vid, idProduct=pid) is not None:
                return (vid, pid, name)
        except Exception:
            continue
    return None


def list_all_usb_devices() -> list[tuple[int, int, str]]:
    """Return [(vid, pid, label), ...] for every USB device pyusb can see."""
    try:
        import usb.core
    except ImportError:
        return []

    results: list[tuple[int, int, str]] = []
    try:
        for dev in usb.core.find(find_all=True):
            label = ""
            try:
                manuf = usb.util.get_string(dev, dev.iManufacturer) or ""
                prod = usb.util.get_string(dev, dev.iProduct) or ""
                label = f"{manuf} {prod}".strip()
            except Exception:
                label = ""
            results.append((dev.idVendor, dev.idProduct, label))
    except Exception:
        pass
    return results


# --- Settings persistence --------------------------------------------------

def load_settings() -> dict:
    if SETTINGS_PATH.exists():
        try:
            return json.loads(SETTINGS_PATH.read_text())
        except Exception:
            return {}
    return {}


def save_settings(data: dict) -> None:
    try:
        SETTINGS_PATH.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Could not save settings: {e}", file=sys.stderr)


# --- GUI -------------------------------------------------------------------

class ItemRow:
    """One row of the items table (qty / name / price + remove button)."""

    def __init__(self, parent: tk.Widget, on_change, on_remove, row_index: int):
        self.frame = ttk.Frame(parent)
        self.frame.grid(row=row_index, column=0, sticky="ew", pady=1)
        self.frame.columnconfigure(1, weight=1)

        self.qty = tk.StringVar(value="1")
        self.name = tk.StringVar(value="")
        self.price = tk.StringVar(value="0.00")

        qty_e = ttk.Entry(self.frame, textvariable=self.qty, width=4)
        name_e = ttk.Entry(self.frame, textvariable=self.name)
        price_e = ttk.Entry(self.frame, textvariable=self.price, width=8)
        remove_b = ttk.Button(self.frame, text="✕", width=2,
                              command=lambda: on_remove(self))

        qty_e.grid(row=0, column=0, padx=2)
        name_e.grid(row=0, column=1, sticky="ew", padx=2)
        price_e.grid(row=0, column=2, padx=2)
        remove_b.grid(row=0, column=3, padx=2)

        for var in (self.qty, self.name, self.price):
            var.trace_add("write", lambda *_: on_change())

    def to_item(self) -> Item:
        try:
            qty = int(self.qty.get() or "1")
        except ValueError:
            qty = 1
        try:
            price = float(self.price.get() or "0")
        except ValueError:
            price = 0.0
        return Item(qty=qty, name=self.name.get().strip(), price=price)

    def destroy(self) -> None:
        self.frame.destroy()


class ReceiptApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        root.title("Film Set Receipt Printer")
        root.geometry("1080x820")
        root.minsize(900, 700)

        self.settings = load_settings()
        self.item_rows: list[ItemRow] = []

        self._build_ui()
        self._populate_from_settings()
        # If user has no saved items, seed with the example
        if not self.item_rows:
            self._add_item_row(qty="1", name="Screw driver", price="4.00")
            self._add_item_row(qty="1", name="Tequila Sunrise", price="4.00")
            self._add_item_row(qty="1", name="Tom Collins", price="4.00")
            self._add_item_row(qty="1", name="Makers Mark", price="6.00")
        self._refresh_preview()

    # ---- Layout

    def _build_ui(self) -> None:
        main = ttk.Frame(self.root, padding=10)
        main.pack(fill="both", expand=True)
        main.columnconfigure(0, weight=2)
        main.columnconfigure(1, weight=1)
        main.rowconfigure(0, weight=1)

        # Left: form
        form = ttk.Frame(main)
        form.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        self._build_form(form)

        # Right: preview + buttons
        side = ttk.Frame(main)
        side.grid(row=0, column=1, sticky="nsew")
        side.rowconfigure(1, weight=1)
        side.columnconfigure(0, weight=1)

        ttk.Label(side, text="PREVIEW", font=("Helvetica", 11, "bold")).grid(
            row=0, column=0, sticky="w"
        )
        self.preview = tk.Text(
            side, font=("Menlo", 10), width=44, height=30,
            bg="#fefefe", fg="#111", relief="solid", borderwidth=1, padx=10, pady=10,
        )
        self.preview.grid(row=1, column=0, sticky="nsew", pady=(4, 8))
        self.preview.configure(state="disabled")

        btn_frame = ttk.Frame(side)
        btn_frame.grid(row=2, column=0, sticky="ew")
        btn_frame.columnconfigure(0, weight=1)
        btn_frame.columnconfigure(1, weight=1)

        ttk.Button(btn_frame, text="USB Settings…",
                   command=self._open_usb_settings).grid(
            row=0, column=0, sticky="ew", padx=2, pady=2
        )
        ttk.Button(btn_frame, text="Save as Default",
                   command=self._save_as_default).grid(
            row=0, column=1, sticky="ew", padx=2, pady=2
        )
        ttk.Button(btn_frame, text="Save to File…",
                   command=self._save_to_file).grid(
            row=1, column=0, sticky="ew", padx=2, pady=2
        )
        ttk.Button(btn_frame, text="Load from File…",
                   command=self._load_from_file).grid(
            row=1, column=1, sticky="ew", padx=2, pady=2
        )

        print_btn = tk.Button(
            btn_frame, text="🖨  PRINT RECEIPT",
            command=self._print_receipt,
            font=("Helvetica", 14, "bold"),
            bg="#1a7a3a", fg="white", activebackground="#0f5226",
            relief="flat", padx=12, pady=10,
        )
        print_btn.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(8, 2))

    def _build_form(self, parent: ttk.Frame) -> None:
        # Use a scrollable canvas in case window is small
        canvas = tk.Canvas(parent, highlightthickness=0)
        scroll = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        inner = ttk.Frame(canvas)

        inner.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.create_window((0, 0), window=inner, anchor="nw")
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        # Mouse wheel scrolling (macOS friendly)
        def _scroll(event):
            canvas.yview_scroll(int(-1 * (event.delta)), "units")
        inner.bind_all("<MouseWheel>", _scroll)

        row = 0

        def section(title: str) -> int:
            nonlocal row
            ttk.Label(inner, text=title,
                      font=("Helvetica", 11, "bold")).grid(
                row=row, column=0, columnspan=4, sticky="w", pady=(12, 4)
            )
            row += 1
            return row

        def field(label: str, var: tk.Variable, width: int = 30,
                  colspan: int = 3) -> None:
            nonlocal row
            ttk.Label(inner, text=label).grid(
                row=row, column=0, sticky="w", padx=(0, 6), pady=2
            )
            e = ttk.Entry(inner, textvariable=var, width=width)
            e.grid(row=row, column=1, columnspan=colspan, sticky="ew", pady=2)
            var.trace_add("write", lambda *_: self._refresh_preview())
            row += 1

        inner.columnconfigure(1, weight=1)

        # ---- Store info
        section("STORE / HEADER")
        self.v_store = tk.StringVar(value="BLUE MOON DINER")
        self.v_addr1 = tk.StringVar(value="123 Main Street")
        self.v_addr2 = tk.StringVar(value="Los Angeles, CA 90001")
        self.v_phone = tk.StringVar(value="(555) 867-5309")
        field("Store name", self.v_store)
        field("Address line 1", self.v_addr1)
        field("Address line 2", self.v_addr2)
        field("Phone", self.v_phone)

        # ---- Date/time
        section("DATE / TIME")
        self.v_when = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d %H:%M"))
        ttk.Label(inner, text="When").grid(row=row, column=0, sticky="w", padx=(0, 6))
        when_entry = ttk.Entry(inner, textvariable=self.v_when, width=22)
        when_entry.grid(row=row, column=1, sticky="w", pady=2)
        ttk.Button(inner, text="Now",
                   command=self._set_when_now).grid(
            row=row, column=2, sticky="w", padx=4
        )
        self.v_when.trace_add("write", lambda *_: self._refresh_preview())
        row += 1

        # ---- Order info
        section("ORDER")
        self.v_server = tk.StringVar(value="Michelle")
        self.v_order = tk.StringVar(value="1-152")
        self.v_table = tk.StringVar(value="")
        field("Server", self.v_server)
        field("Order #", self.v_order)
        field("Table (optional)", self.v_table)

        # ---- Items
        section("ITEMS")
        header = ttk.Frame(inner)
        header.grid(row=row, column=0, columnspan=4, sticky="ew")
        header.columnconfigure(1, weight=1)
        ttk.Label(header, text="Qty", font=("Helvetica", 9, "bold")).grid(
            row=0, column=0, padx=2)
        ttk.Label(header, text="Item", font=("Helvetica", 9, "bold")).grid(
            row=0, column=1, sticky="w", padx=2)
        ttk.Label(header, text="Price", font=("Helvetica", 9, "bold")).grid(
            row=0, column=2, padx=2)
        row += 1

        self.items_frame = ttk.Frame(inner)
        self.items_frame.grid(row=row, column=0, columnspan=4, sticky="ew")
        self.items_frame.columnconfigure(0, weight=1)
        row += 1

        ttk.Button(inner, text="+ Add Item", command=lambda: self._add_item_row()).grid(
            row=row, column=0, columnspan=4, sticky="w", pady=4
        )
        row += 1

        # ---- Tax
        section("TAX")
        self.v_tax = tk.StringVar(value="9.5")
        field("Tax rate (%)", self.v_tax, width=10, colspan=1)

        # ---- Payment
        section("PAYMENT")
        self.v_pay_method = tk.StringVar(value="CASH")
        ttk.Label(inner, text="Method").grid(row=row, column=0, sticky="w")
        method = ttk.Combobox(
            inner, textvariable=self.v_pay_method,
            values=["CASH", "CREDIT", "DEBIT", "VISA", "MASTERCARD", "AMEX"],
            width=14,
        )
        method.grid(row=row, column=1, sticky="w", pady=2)
        self.v_pay_method.trace_add("write", lambda *_: self._refresh_preview())
        row += 1

        self.v_tendered = tk.StringVar(value="")
        ttk.Label(inner, text="Tendered (blank = exact)").grid(
            row=row, column=0, sticky="w")
        ttk.Entry(inner, textvariable=self.v_tendered, width=10).grid(
            row=row, column=1, sticky="w", pady=2)
        self.v_tendered.trace_add("write", lambda *_: self._refresh_preview())
        row += 1

        # ---- Footer
        section("FOOTER")
        self.footer_text = tk.Text(inner, height=3, width=40, wrap="word")
        self.footer_text.insert("1.0", "Thank you for dining with us!")
        self.footer_text.grid(row=row, column=0, columnspan=4, sticky="ew", pady=2)
        self.footer_text.bind("<<Modified>>", self._on_footer_modified)
        row += 1

    # ---- Items table

    def _add_item_row(self, qty: str = "1", name: str = "",
                      price: str = "0.00") -> None:
        idx = len(self.item_rows)
        row = ItemRow(self.items_frame,
                      on_change=self._refresh_preview,
                      on_remove=self._remove_item_row,
                      row_index=idx)
        row.qty.set(qty)
        row.name.set(name)
        row.price.set(price)
        self.item_rows.append(row)
        self._refresh_preview()

    def _remove_item_row(self, row: ItemRow) -> None:
        if row in self.item_rows:
            self.item_rows.remove(row)
            row.destroy()
            self._refresh_preview()

    # ---- Helpers

    def _set_when_now(self) -> None:
        self.v_when.set(datetime.now().strftime("%Y-%m-%d %H:%M"))

    def _on_footer_modified(self, _event) -> None:
        if self.footer_text.edit_modified():
            self.footer_text.edit_modified(False)
            self._refresh_preview()

    def _parse_when(self) -> datetime:
        s = self.v_when.get().strip()
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M%p", "%m/%d/%y %H:%M",
                    "%m/%d/%Y %H:%M"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return datetime.now()

    def _gather_data(self) -> ReceiptData:
        try:
            tax = float(self.v_tax.get() or "0")
        except ValueError:
            tax = 0.0
        tendered_raw = self.v_tendered.get().strip()
        tendered: Optional[float] = None
        if tendered_raw:
            try:
                tendered = float(tendered_raw)
            except ValueError:
                tendered = None
        return ReceiptData(
            store_name=self.v_store.get(),
            address1=self.v_addr1.get(),
            address2=self.v_addr2.get(),
            phone=self.v_phone.get(),
            server=self.v_server.get(),
            order_number=self.v_order.get(),
            table=self.v_table.get(),
            when=self._parse_when(),
            items=[r.to_item() for r in self.item_rows],
            tax_rate=tax,
            payment_method=self.v_pay_method.get(),
            tendered=tendered,
            footer=self.footer_text.get("1.0", "end").rstrip(),
        )

    def _refresh_preview(self) -> None:
        try:
            text = build_preview(self._gather_data())
        except Exception:
            text = "(preview error)\n" + traceback.format_exc()
        self.preview.configure(state="normal")
        self.preview.delete("1.0", "end")
        self.preview.insert("1.0", text)
        self.preview.configure(state="disabled")

    # ---- Settings / save

    def _populate_from_settings(self) -> None:
        s = self.settings
        if not s:
            return
        self.v_store.set(s.get("store_name", self.v_store.get()))
        self.v_addr1.set(s.get("address1", self.v_addr1.get()))
        self.v_addr2.set(s.get("address2", self.v_addr2.get()))
        self.v_phone.set(s.get("phone", self.v_phone.get()))
        self.v_server.set(s.get("server", self.v_server.get()))
        self.v_tax.set(str(s.get("tax_rate", self.v_tax.get())))
        self.v_pay_method.set(s.get("payment_method", self.v_pay_method.get()))
        footer = s.get("footer")
        if footer is not None:
            self.footer_text.delete("1.0", "end")
            self.footer_text.insert("1.0", footer)
        # Items
        for item in s.get("items", []):
            self._add_item_row(
                qty=str(item.get("qty", "1")),
                name=item.get("name", ""),
                price=str(item.get("price", "0.00")),
            )

    def _save_as_default(self) -> None:
        data = self._gather_data()
        save_settings({
            "store_name": data.store_name,
            "address1": data.address1,
            "address2": data.address2,
            "phone": data.phone,
            "server": data.server,
            "tax_rate": data.tax_rate,
            "payment_method": data.payment_method,
            "footer": data.footer,
            "items": [asdict(i) for i in data.items],
            "vendor_id": self.settings.get("vendor_id"),
            "product_id": self.settings.get("product_id"),
        })
        self.settings = load_settings()
        messagebox.showinfo("Saved", f"Saved defaults to:\n{SETTINGS_PATH}")

    def _save_to_file(self) -> None:
        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON", "*.json")],
            title="Save receipt",
        )
        if not path:
            return
        data = self._gather_data()
        Path(path).write_text(json.dumps({
            "store_name": data.store_name,
            "address1": data.address1,
            "address2": data.address2,
            "phone": data.phone,
            "server": data.server,
            "order_number": data.order_number,
            "table": data.table,
            "when": data.when.isoformat(),
            "tax_rate": data.tax_rate,
            "payment_method": data.payment_method,
            "tendered": data.tendered,
            "footer": data.footer,
            "items": [asdict(i) for i in data.items],
        }, indent=2))
        messagebox.showinfo("Saved", f"Saved receipt to:\n{path}")

    def _load_from_file(self) -> None:
        path = filedialog.askopenfilename(
            filetypes=[("JSON", "*.json")], title="Load receipt"
        )
        if not path:
            return
        try:
            d = json.loads(Path(path).read_text())
        except Exception as e:
            messagebox.showerror("Load failed", str(e))
            return
        self.v_store.set(d.get("store_name", ""))
        self.v_addr1.set(d.get("address1", ""))
        self.v_addr2.set(d.get("address2", ""))
        self.v_phone.set(d.get("phone", ""))
        self.v_server.set(d.get("server", ""))
        self.v_order.set(d.get("order_number", ""))
        self.v_table.set(d.get("table", ""))
        if d.get("when"):
            try:
                self.v_when.set(
                    datetime.fromisoformat(d["when"]).strftime("%Y-%m-%d %H:%M")
                )
            except Exception:
                pass
        self.v_tax.set(str(d.get("tax_rate", "0")))
        self.v_pay_method.set(d.get("payment_method", "CASH"))
        self.v_tendered.set(
            "" if d.get("tendered") is None else str(d.get("tendered"))
        )
        self.footer_text.delete("1.0", "end")
        self.footer_text.insert("1.0", d.get("footer", ""))
        # Clear items
        for r in list(self.item_rows):
            self._remove_item_row(r)
        for item in d.get("items", []):
            self._add_item_row(
                qty=str(item.get("qty", "1")),
                name=item.get("name", ""),
                price=str(item.get("price", "0.00")),
            )

    # ---- USB / Print

    def _open_usb_settings(self) -> None:
        UsbSettingsDialog(self.root, self.settings, self._on_settings_changed)

    def _on_settings_changed(self, new_settings: dict) -> None:
        # Preserve everything that's already saved, just update USB IDs
        merged = dict(self.settings)
        merged.update(new_settings)
        save_settings(merged)
        self.settings = load_settings()

    def _print_receipt(self) -> None:
        try:
            from escpos.printer import Usb
        except ImportError:
            messagebox.showerror(
                "Missing dependency",
                "python-escpos is not installed.\n\n"
                "In Terminal, run:\n"
                "  pip3 install python-escpos pyusb\n\n"
                "On macOS you also need libusb:\n"
                "  brew install libusb",
            )
            return

        vid = self.settings.get("vendor_id")
        pid = self.settings.get("product_id")
        printer_name = ""

        if vid is None or pid is None:
            # Try auto-detect
            detected = detect_known_printer()
            if detected:
                vid, pid, printer_name = detected
            else:
                messagebox.showerror(
                    "No printer found",
                    "Could not auto-detect a USB receipt printer.\n\n"
                    "Click 'USB Settings…' to choose your printer from a "
                    "list of connected USB devices, then try again.",
                )
                return

        data = self._gather_data()
        try:
            printer = Usb(int(vid), int(pid), timeout=0, in_ep=0x82, out_ep=0x01)
            print_to_escpos(printer, data)
            printer.close()
        except Exception as e:
            # Try without explicit endpoints (let pyusb pick them)
            try:
                printer = Usb(int(vid), int(pid), timeout=0)
                print_to_escpos(printer, data)
                printer.close()
            except Exception as e2:
                messagebox.showerror(
                    "Print failed",
                    f"Couldn't print to printer "
                    f"(VID 0x{int(vid):04x} PID 0x{int(pid):04x}).\n\n"
                    f"{e2}\n\n"
                    "Troubleshooting:\n"
                    "  • Make sure the printer is plugged in & powered on\n"
                    "  • Install libusb: brew install libusb\n"
                    "  • On macOS, you may need to run this app with sudo\n"
                    "  • Try 'USB Settings…' to pick the right device",
                )
                return

        # Success — auto-save defaults so VID/PID stays remembered
        merged = dict(self.settings)
        merged["vendor_id"] = int(vid)
        merged["product_id"] = int(pid)
        save_settings(merged)
        self.settings = load_settings()


class UsbSettingsDialog:
    def __init__(self, parent: tk.Tk, settings: dict,
                 on_save) -> None:
        self.top = tk.Toplevel(parent)
        self.top.title("USB Printer Settings")
        self.top.geometry("520x460")
        self.top.transient(parent)

        ttk.Label(self.top,
                  text="Pick your receipt printer from the list below, "
                       "or enter Vendor / Product IDs manually.",
                  wraplength=480).pack(padx=12, pady=(12, 6), anchor="w")

        list_frame = ttk.Frame(self.top)
        list_frame.pack(fill="both", expand=True, padx=12, pady=6)

        self.listbox = tk.Listbox(list_frame, font=("Menlo", 11), height=12)
        scroll = ttk.Scrollbar(list_frame, command=self.listbox.yview)
        self.listbox.configure(yscrollcommand=scroll.set)
        self.listbox.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        self.devices: list[tuple[int, int, str]] = []

        btns = ttk.Frame(self.top)
        btns.pack(fill="x", padx=12, pady=4)
        ttk.Button(btns, text="↻ Refresh USB list",
                   command=self._refresh).pack(side="left")
        ttk.Button(btns, text="Use Selected →",
                   command=self._use_selected).pack(side="right")

        manual = ttk.LabelFrame(self.top, text="Manual entry")
        manual.pack(fill="x", padx=12, pady=10)
        ttk.Label(manual, text="Vendor ID (hex):").grid(
            row=0, column=0, padx=6, pady=4, sticky="w")
        ttk.Label(manual, text="Product ID (hex):").grid(
            row=1, column=0, padx=6, pady=4, sticky="w")
        self.vid_var = tk.StringVar(
            value=hex(settings["vendor_id"]) if settings.get("vendor_id") else ""
        )
        self.pid_var = tk.StringVar(
            value=hex(settings["product_id"]) if settings.get("product_id") else ""
        )
        ttk.Entry(manual, textvariable=self.vid_var, width=14).grid(
            row=0, column=1, padx=6, pady=4, sticky="w")
        ttk.Entry(manual, textvariable=self.pid_var, width=14).grid(
            row=1, column=1, padx=6, pady=4, sticky="w")

        action = ttk.Frame(self.top)
        action.pack(fill="x", padx=12, pady=(6, 12))
        ttk.Button(action, text="Cancel",
                   command=self.top.destroy).pack(side="right", padx=4)
        ttk.Button(action, text="Save",
                   command=self._save).pack(side="right", padx=4)

        self.on_save = on_save
        self._refresh()

    def _refresh(self) -> None:
        self.listbox.delete(0, "end")
        try:
            import usb.core  # noqa: F401
        except ImportError:
            self.listbox.insert(
                "end",
                " pyusb not installed — run: pip3 install pyusb python-escpos"
            )
            return
        self.devices = list_all_usb_devices()
        if not self.devices:
            self.listbox.insert("end",
                                " No USB devices found (or libusb missing).")
            self.listbox.insert("end",
                                " Try: brew install libusb")
            return
        for vid, pid, label in self.devices:
            known = next(
                (n for v, p, n in KNOWN_PRINTERS if v == vid and p == pid),
                None,
            )
            tag = f"  ★ {known}" if known else ""
            self.listbox.insert(
                "end",
                f" VID 0x{vid:04x}  PID 0x{pid:04x}   {label}{tag}",
            )

    def _use_selected(self) -> None:
        sel = self.listbox.curselection()
        if not sel or sel[0] >= len(self.devices):
            return
        vid, pid, _ = self.devices[sel[0]]
        self.vid_var.set(hex(vid))
        self.pid_var.set(hex(pid))

    def _save(self) -> None:
        vid_s = self.vid_var.get().strip()
        pid_s = self.pid_var.get().strip()
        try:
            vid = int(vid_s, 16) if vid_s.startswith("0x") else int(vid_s)
        except (ValueError, AttributeError):
            messagebox.showerror("Invalid", "Vendor ID is not a number.")
            return
        try:
            pid = int(pid_s, 16) if pid_s.startswith("0x") else int(pid_s)
        except (ValueError, AttributeError):
            messagebox.showerror("Invalid", "Product ID is not a number.")
            return
        self.on_save({"vendor_id": vid, "product_id": pid})
        messagebox.showinfo(
            "Saved",
            f"Printer set to VID 0x{vid:04x} PID 0x{pid:04x}.\n\n"
            "You can now press PRINT RECEIPT.",
        )
        self.top.destroy()


def main() -> None:
    if not _TK_AVAILABLE:
        print("ERROR: tkinter is not available on this Python install.")
        print(f"  ({_TK_ERROR})")
        print("On macOS, install Python from python.org (it bundles tkinter)")
        print("or run:   brew install python-tk")
        sys.exit(1)
    root = tk.Tk()
    try:
        # Nicer look on macOS
        style = ttk.Style()
        if "aqua" in style.theme_names():
            style.theme_use("aqua")
    except Exception:
        pass
    ReceiptApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
