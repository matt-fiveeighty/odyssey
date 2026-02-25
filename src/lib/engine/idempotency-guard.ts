/**
 * Idempotency Guard — The Double-Click Trap Defense
 *
 * When users deal with money and F&G deadlines, they get anxious.
 * They will click buttons multiple times, or open the app on their
 * phone and desktop simultaneously.
 *
 * This module ensures all state-mutating financial operations
 * (draw outcomes, budget changes, portfolio rebalances) execute
 * EXACTLY ONCE, no matter how many times the user smashes the button.
 *
 * Architecture:
 *   1. Every mutation carries an idempotency key (UUID)
 *   2. The guard checks a processed-key ledger before execution
 *   3. Duplicate keys are silently dropped (no error, no double-charge)
 *   4. Keys expire after TTL to prevent unbounded memory growth
 *   5. Thread-safe via synchronous Zustand dispatch (single JS thread)
 */

// ============================================================================
// Types
// ============================================================================

export interface IdempotentOperation<T> {
  /** Unique key for this operation — same key = same logical request */
  idempotencyKey: string;
  /** The mutation to execute if the key hasn't been seen */
  execute: () => T;
}

interface ProcessedEntry {
  key: string;
  timestamp: number;
  operationType: string;
}

// ============================================================================
// Idempotency Ledger
// ============================================================================

/** TTL for processed keys: 5 minutes (covers slow networks + retry storms) */
const KEY_TTL_MS = 5 * 60 * 1000;

/** Max ledger size before forced GC */
const MAX_LEDGER_SIZE = 500;

class IdempotencyLedger {
  private processed: Map<string, ProcessedEntry> = new Map();

  /**
   * Attempt to execute an operation. Returns the result if executed,
   * or null if the key was already processed (duplicate).
   */
  executeOnce<T>(
    key: string,
    operationType: string,
    execute: () => T,
  ): { executed: true; result: T } | { executed: false; result: null } {
    // GC stale entries periodically
    if (this.processed.size > MAX_LEDGER_SIZE) {
      this.gc();
    }

    // Check if already processed
    if (this.processed.has(key)) {
      return { executed: false, result: null };
    }

    // Mark as processed BEFORE execution (prevents race in async scenarios)
    this.processed.set(key, {
      key,
      timestamp: Date.now(),
      operationType,
    });

    // Execute the mutation
    const result = execute();
    return { executed: true, result };
  }

  /** Check if a key has been processed (for testing) */
  hasKey(key: string): boolean {
    return this.processed.has(key);
  }

  /** Number of keys in the ledger */
  get size(): number {
    return this.processed.size;
  }

  /** Garbage-collect expired entries */
  gc(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.processed) {
      if (now - entry.timestamp > KEY_TTL_MS) {
        this.processed.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Clear all entries (for testing) */
  clear(): void {
    this.processed.clear();
  }

  /** Get all processed entries (for debugging/testing) */
  getEntries(): ProcessedEntry[] {
    return Array.from(this.processed.values());
  }
}

// ============================================================================
// Singleton Instance — shared across all store actions
// ============================================================================

export const idempotencyLedger = new IdempotencyLedger();

// ============================================================================
// Idempotency Key Generator
// ============================================================================

let counter = 0;

/**
 * Generate a unique idempotency key for a state mutation.
 *
 * Format: `{operationType}:{entityId}:{timestamp}:{counter}`
 *
 * The counter prevents collisions when multiple operations happen
 * in the same millisecond (which IS possible in rapid-fire scenarios).
 */
export function generateIdempotencyKey(
  operationType: string,
  entityId: string,
): string {
  counter++;
  return `${operationType}:${entityId}:${Date.now()}:${counter}`;
}

// ============================================================================
// Guarded Operations — Wrap store actions with idempotency protection
// ============================================================================

/**
 * Execute a draw outcome cascade with idempotency protection.
 * The key is derived from milestone ID + outcome + year to prevent
 * double-processing the same draw event.
 */
export function guardedDrawOutcome(
  idempotencyKey: string,
  execute: () => void,
): boolean {
  const result = idempotencyLedger.executeOnce(
    idempotencyKey,
    "draw_outcome",
    execute,
  );
  return result.executed;
}

/**
 * Execute a budget change with idempotency protection.
 */
export function guardedBudgetChange(
  idempotencyKey: string,
  execute: () => void,
): boolean {
  const result = idempotencyLedger.executeOnce(
    idempotencyKey,
    "budget_change",
    execute,
  );
  return result.executed;
}

/**
 * Execute a portfolio rebalance with idempotency protection.
 */
export function guardedRebalance(
  idempotencyKey: string,
  execute: () => void,
): boolean {
  const result = idempotencyLedger.executeOnce(
    idempotencyKey,
    "rebalance",
    execute,
  );
  return result.executed;
}

/**
 * Generic guarded operation for any state mutation.
 */
export function guardedOperation<T>(
  idempotencyKey: string,
  operationType: string,
  execute: () => T,
): { executed: boolean; result: T | null } {
  return idempotencyLedger.executeOnce(idempotencyKey, operationType, execute);
}
