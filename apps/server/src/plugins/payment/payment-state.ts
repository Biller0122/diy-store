// ─── Payment State Machine ────────────────────────────────────
// States: PENDING → PROCESSING → SETTLED | FAILED | CANCELLED
// Drop-in ready: real PSP code replaces the mock transitions

export type PaymentState =
  | 'PENDING'
  | 'PROCESSING'
  | 'SETTLED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentStateRecord {
  orderId:   string;
  invoiceId: string;
  method:    'qpay' | 'monpay' | 'card';
  amount:    number;          // minor units (möngö)
  state:     PaymentState;
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
  settledAt?: string;
  failedAt?:  string;
  errorMsg?:  string;
}

// ─── Valid transitions ────────────────────────────────────────

const TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  PENDING:    ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SETTLED', 'FAILED', 'CANCELLED'],
  SETTLED:    [],
  FAILED:     [],
  CANCELLED:  [],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Mock-mode guard ──────────────────────────────────────────
// Mock payments auto-settle without money changing hands, so they MUST never run
// in production. If real credentials are missing in production the handler should
// fail loudly (real API path errors) rather than silently fake a settlement.
export function paymentMockMode(hasRealCredentials: boolean): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return !hasRealCredentials || process.env.PAYMENT_MOCK_MODE === 'true';
}

export function assertPaymentMockModeAllowed() {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_MOCK_MODE === 'true') {
    throw new Error('PAYMENT_MOCK_MODE=true is forbidden in production');
  }
}

// ─── Factory ──────────────────────────────────────────────────

export function createPaymentRecord(
  orderId:   string,
  invoiceId: string,
  method:    PaymentStateRecord['method'],
  amount:    number,
): PaymentStateRecord {
  const now = new Date().toISOString();
  return { orderId, invoiceId, method, amount, state: 'PENDING', createdAt: now, updatedAt: now };
}

// ─── Transition helper ────────────────────────────────────────

export function transition(
  record: PaymentStateRecord,
  to: PaymentState,
  extra: Partial<PaymentStateRecord> = {},
): PaymentStateRecord {
  if (!canTransition(record.state, to)) {
    throw new Error(`Invalid payment transition: ${record.state} → ${to}`);
  }
  const now = new Date().toISOString();
  return {
    ...record,
    ...extra,
    state:     to,
    updatedAt: now,
    ...(to === 'SETTLED'   ? { settledAt: now } : {}),
    ...(to === 'FAILED'    ? { failedAt:  now } : {}),
  };
}
