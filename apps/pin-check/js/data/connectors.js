/**
 * Connector definitions — the one place a new connector needs to be added.
 * Each entry is pure data (no UI, no layout math): id, display name, a
 * `shape` that tells logic/layout.js how to place the pins, shape-specific
 * sizing (rows/cols, or nothing for 'circular'), and the pin list itself
 * (number + signal/function/notes shown on hover — all optional).
 *
 * Adding a connector = adding an object here. No other file needs to change
 * — the diagram, the pin picker in the test sequence, and the export all
 * read this list (and each pin's own fields) generically.
 */
export const CONNECTOR_SHAPES = ['grid', 'dsub', 'circular'];

export const CONNECTORS = [
  {
    id: 'dsub9-m',
    name: 'D-Sub 9 (DB9) — Maschio',
    description: 'Connettore seriale RS-232 a 9 pin, due file sfalsate (5 + 4).',
    shape: 'dsub',
    topRow: 5,
    bottomRow: 4,
    pins: [
      { number: 1, signal: 'DCD', function: 'Data Carrier Detect', notes: '' },
      { number: 2, signal: 'RXD', function: 'Receive Data', notes: '' },
      { number: 3, signal: 'TXD', function: 'Transmit Data', notes: '' },
      { number: 4, signal: 'DTR', function: 'Data Terminal Ready', notes: '' },
      { number: 5, signal: 'GND', function: 'Signal Ground', notes: '' },
      { number: 6, signal: 'DSR', function: 'Data Set Ready', notes: '' },
      { number: 7, signal: 'RTS', function: 'Request To Send', notes: '' },
      { number: 8, signal: 'CTS', function: 'Clear To Send', notes: '' },
      { number: 9, signal: 'RI', function: 'Ring Indicator', notes: '' }
    ]
  },
  {
    id: 'header-2x5',
    name: 'Header 10 pin (2×5)',
    description: 'Connettore generico a pettine, due file da 5 pin.',
    shape: 'grid',
    rows: 2,
    cols: 5,
    pins: [
      { number: 1, signal: 'VCC', function: 'Alimentazione +', notes: '' },
      { number: 2, signal: 'VCC', function: 'Alimentazione +', notes: '' },
      { number: 3, signal: 'GND', function: 'Massa', notes: '' },
      { number: 4, signal: 'GND', function: 'Massa', notes: '' },
      { number: 5, signal: 'TDO', function: 'JTAG Test Data Out', notes: '' },
      { number: 6, signal: 'TDI', function: 'JTAG Test Data In', notes: '' },
      { number: 7, signal: 'TMS', function: 'JTAG Test Mode Select', notes: '' },
      { number: 8, signal: 'TCK', function: 'JTAG Test Clock', notes: '' },
      { number: 9, signal: 'RST', function: 'Reset', notes: '' },
      { number: 10, signal: 'NC', function: 'Non collegato', notes: '' }
    ]
  },
  {
    id: 'circ-8',
    name: 'Circolare 8 pin',
    description: 'Connettore circolare generico (tipo MIL/AMP), 8 pin equidistanti.',
    shape: 'circular',
    pins: [
      { number: 1, signal: 'A', function: '', notes: '' },
      { number: 2, signal: 'B', function: '', notes: '' },
      { number: 3, signal: 'C', function: '', notes: '' },
      { number: 4, signal: 'D', function: '', notes: '' },
      { number: 5, signal: 'E', function: '', notes: '' },
      { number: 6, signal: 'F', function: '', notes: '' },
      { number: 7, signal: 'G', function: '', notes: '' },
      { number: 8, signal: 'H', function: '', notes: '' }
    ]
  }
];

export function getConnector(id) {
  return CONNECTORS.find(c => c.id === id) || null;
}

export function findPin(connector, number) {
  if (!connector) return null;
  return connector.pins.find(p => String(p.number) === String(number)) || null;
}
