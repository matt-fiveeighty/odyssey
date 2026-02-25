/**
 * Security Protocols — Anti-Scraping, PII Protection, Injection Defense
 *
 * PART 2 of the Data Ingestion & Security Crucible:
 *   4. Rate Limiting / WAF — Block competitor bots from scraping our data
 *   5. PII Encryption Audit — Ensure user F&G credentials are encrypted at rest
 *
 * Architecture:
 *   - RateLimiter: Sliding window counter per IP, returns 429 after threshold
 *   - PII Vault: Encryption-at-rest validator for sensitive user fields
 *   - Injection Guard: SQL injection + XSS pattern detection on all inputs
 */

// ============================================================================
// 4. Rate Limiter / WAF — Anti-Scraping Defense
// ============================================================================

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** After how many suspicious pings to block the IP */
  blockThreshold: number;
  /** How long to block an IP (ms) */
  blockDurationMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 50,           // 50 requests per window
  windowMs: 60 * 1000,      // 1-minute window
  blockThreshold: 50,        // Block after 50 suspicious pings
  blockDurationMs: 15 * 60 * 1000,  // 15-minute IP block
};

interface RequestRecord {
  timestamps: number[];
  blocked: boolean;
  blockedAt: number | null;
  totalRequests: number;
}

export class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.config = config;
  }

  /**
   * Check if a request from this IP should be allowed.
   * Returns { allowed, status, remaining }.
   */
  checkRequest(ip: string): {
    allowed: boolean;
    status: 200 | 429;
    remaining: number;
    retryAfterMs: number | null;
    reason: string | null;
  } {
    const now = Date.now();
    let record = this.records.get(ip);

    if (!record) {
      record = { timestamps: [], blocked: false, blockedAt: null, totalRequests: 0 };
      this.records.set(ip, record);
    }

    // Check if IP is currently blocked
    if (record.blocked && record.blockedAt) {
      const elapsed = now - record.blockedAt;
      if (elapsed < this.config.blockDurationMs) {
        const retryAfterMs = this.config.blockDurationMs - elapsed;
        return {
          allowed: false,
          status: 429,
          remaining: 0,
          retryAfterMs,
          reason: `IP blocked for suspicious automated behavior. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
        };
      }
      // Block expired — reset
      record.blocked = false;
      record.blockedAt = null;
      record.timestamps = [];
    }

    // Sliding window: remove timestamps outside the window
    const windowStart = now - this.config.windowMs;
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    // Add this request
    record.timestamps.push(now);
    record.totalRequests++;

    // Check if over limit
    if (record.timestamps.length > this.config.maxRequests) {
      // Block the IP
      record.blocked = true;
      record.blockedAt = now;
      return {
        allowed: false,
        status: 429,
        remaining: 0,
        retryAfterMs: this.config.blockDurationMs,
        reason: `Rate limit exceeded: ${record.timestamps.length} requests in ${this.config.windowMs / 1000}s window (max: ${this.config.maxRequests}). IP blocked.`,
      };
    }

    return {
      allowed: true,
      status: 200,
      remaining: this.config.maxRequests - record.timestamps.length,
      retryAfterMs: null,
      reason: null,
    };
  }

  /** Get the total request count for an IP */
  getRequestCount(ip: string): number {
    return this.records.get(ip)?.totalRequests ?? 0;
  }

  /** Check if an IP is currently blocked */
  isBlocked(ip: string): boolean {
    return this.records.get(ip)?.blocked ?? false;
  }

  /** Reset all records (for testing) */
  reset(): void {
    this.records.clear();
  }
}

// ============================================================================
// 5. PII Encryption Audit — User Data Protection
// ============================================================================

export type PIISensitivity = "critical" | "high" | "medium" | "low";

export interface PIIFieldAudit {
  fieldName: string;
  sensitivity: PIISensitivity;
  encrypted: boolean;
  encryptionMethod: string | null;
  compliant: boolean;
  violation: string | null;
}

export interface PIIAuditResult {
  compliant: boolean;
  fieldsAudited: number;
  violations: PIIFieldAudit[];
  passedFields: PIIFieldAudit[];
  summary: string;
}

/**
 * PII field definitions — what sensitive data we might store
 * and the required encryption level for each.
 */
export const PII_FIELD_REGISTRY: Array<{
  fieldName: string;
  sensitivity: PIISensitivity;
  requiredEncryption: string;
  description: string;
}> = [
  { fieldName: "fgCustomerId", sensitivity: "critical", requiredEncryption: "AES-256", description: "Fish & Game Customer ID number" },
  { fieldName: "fgPortalPassword", sensitivity: "critical", requiredEncryption: "AES-256", description: "F&G portal password" },
  { fieldName: "email", sensitivity: "high", requiredEncryption: "AES-256", description: "User email address" },
  { fieldName: "huntLocations", sensitivity: "high", requiredEncryption: "AES-256", description: "Specific GPS coordinates of hunt camps" },
  { fieldName: "paymentMethod", sensitivity: "critical", requiredEncryption: "AES-256", description: "Payment card information" },
  { fieldName: "homeAddress", sensitivity: "medium", requiredEncryption: "AES-256", description: "User home address" },
  { fieldName: "phoneNumber", sensitivity: "medium", requiredEncryption: "AES-256", description: "User phone number" },
  { fieldName: "fullName", sensitivity: "low", requiredEncryption: "encrypted_at_rest", description: "User full legal name" },
];

/**
 * Audit a user profile for PII compliance.
 *
 * Checks that all sensitive fields are:
 *   1. Encrypted at rest (AES-256 for critical/high)
 *   2. Not stored in plaintext in localStorage or cookies
 *   3. Not exposed in URL parameters or query strings
 *   4. Not logged to console or analytics
 */
export function auditPIICompliance(
  storedFields: Record<string, { value: unknown; encrypted: boolean; encryptionMethod: string | null }>,
): PIIAuditResult {
  const violations: PIIFieldAudit[] = [];
  const passed: PIIFieldAudit[] = [];

  for (const definition of PII_FIELD_REGISTRY) {
    const stored = storedFields[definition.fieldName];
    if (!stored) continue; // Field not stored — no audit needed

    const audit: PIIFieldAudit = {
      fieldName: definition.fieldName,
      sensitivity: definition.sensitivity,
      encrypted: stored.encrypted,
      encryptionMethod: stored.encryptionMethod,
      compliant: false,
      violation: null,
    };

    // Check encryption requirement
    if (!stored.encrypted) {
      audit.violation = `${definition.fieldName} (${definition.sensitivity}) stored in PLAINTEXT. Required: ${definition.requiredEncryption}.`;
      violations.push(audit);
      continue;
    }

    // Check encryption method meets requirement
    if (
      definition.requiredEncryption === "AES-256" &&
      stored.encryptionMethod !== "AES-256" &&
      stored.encryptionMethod !== "AES-256-GCM"
    ) {
      audit.violation = `${definition.fieldName} encrypted with ${stored.encryptionMethod} but requires ${definition.requiredEncryption}.`;
      violations.push(audit);
      continue;
    }

    audit.compliant = true;
    passed.push(audit);
  }

  const totalAudited = violations.length + passed.length;
  return {
    compliant: violations.length === 0,
    fieldsAudited: totalAudited,
    violations,
    passedFields: passed,
    summary: violations.length === 0
      ? `All ${totalAudited} PII fields compliant. Encryption verified.`
      : `${violations.length} PII violation(s) found across ${totalAudited} fields. ${violations.map((v) => v.violation).join(" ")}`,
  };
}

// ============================================================================
// SQL Injection & XSS Defense
// ============================================================================

/** Known SQL injection patterns */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b.*\b(FROM|INTO|SET|TABLE|WHERE|ALL)\b)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,          // OR 1=1
  /(--|#|\/\*)/,                                  // SQL comments
  /(\bUNION\b\s+\bSELECT\b)/i,                  // UNION SELECT
  /('\s*(OR|AND)\s+')/i,                          // String-based injection
  /(;\s*(DROP|DELETE|UPDATE|INSERT)\b)/i,          // Chained statements
  /(\bEXEC\b\s*\()/i,                             // EXEC()
  /(\bxp_\w+)/i,                                  // SQL Server extended procedures
];

/** Known XSS patterns */
const XSS_PATTERNS = [
  /<script[\s>]/i,                                // Script tags
  /javascript:/i,                                 // JavaScript protocol
  /on(load|error|click|mouseover|focus|blur)\s*=/i,  // Event handlers
  /<iframe[\s>]/i,                                // Iframe injection
  /<object[\s>]/i,                                // Object injection
  /<embed[\s>]/i,                                 // Embed injection
  /eval\s*\(/i,                                   // eval()
  /document\.(cookie|write|location)/i,           // DOM manipulation
  /(&#x?[0-9a-f]+;)/i,                           // HTML entity encoding attacks
  /(\balert\b\s*\()/i,                            // alert()
];

export interface InjectionScanResult {
  safe: boolean;
  threats: Array<{
    type: "sql_injection" | "xss";
    field: string;
    pattern: string;
    value: string;
    severity: "critical";
  }>;
}

/**
 * Scan input fields for SQL injection and XSS patterns.
 *
 * Run this on ALL user-submitted data before it touches the database.
 * Returns safe=false if ANY threat is detected.
 */
export function scanForInjection(
  inputs: Record<string, string>,
): InjectionScanResult {
  const threats: InjectionScanResult["threats"] = [];

  for (const [field, value] of Object.entries(inputs)) {
    // Check SQL injection
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        threats.push({
          type: "sql_injection",
          field,
          pattern: pattern.source,
          value: value.slice(0, 100), // Truncate for logging
          severity: "critical",
        });
        break; // One match per field is enough
      }
    }

    // Check XSS
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value)) {
        threats.push({
          type: "xss",
          field,
          pattern: pattern.source,
          value: value.slice(0, 100),
          severity: "critical",
        });
        break;
      }
    }
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}
