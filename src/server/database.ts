import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getScenario, scenarios } from "../domain/scenarios.js";
import type { QueryResult, ScenarioState, TimelineEvent, VerificationResult } from "../domain/types.js";
import { seedDatabase } from "./seed.js";

const normalizeRows = (rows: unknown[]): Array<Record<string, string | number | null>> =>
  rows.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, value === null ? null : typeof value === "number" ? value : String(value)])));

export interface LabStore {
  db: Database.Database;
  reset(): void;
  list(): ScenarioState[];
  get(id: string): ScenarioState | undefined;
  runQuery(id: string): ScenarioState;
  applyRepair(id: string): ScenarioState;
}

export const createStore = (filename = ":memory:"): LabStore => {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clinics'").get()) seedDatabase(db);

  const timeline = (id: string): TimelineEvent[] => (db.prepare("SELECT * FROM investigation_events WHERE scenario_id = ? ORDER BY id").all(id) as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    scenarioId: String(row.scenario_id),
    occurredAt: String(row.occurred_at),
    type: row.type as TimelineEvent["type"],
    description: String(row.description),
    beforeValue: String(row.before_value),
    afterValue: String(row.after_value),
    affectedRows: Number(row.affected_rows),
    status: row.status as TimelineEvent["status"]
  }));
  const executeQuery = (sql: string): QueryResult => {
    const started = performance.now();
    const rows = normalizeRows(db.prepare(sql).all());
    return {
      columns: rows[0] ? Object.keys(rows[0]) : [],
      rows,
      rowCount: rows.length,
      elapsedMs: Math.max(1, Math.round(performance.now() - started))
    };
  };
  const verify = (id: string): VerificationResult => {
    if (id === "duplicate-invoices") {
      const row = db.prepare(getScenario(id)!.verificationSql).get() as {
        active_invoices: number;
        void_invoices: number;
        invoice_total: number;
        payment_total: number;
      };
      return { passed: row.active_invoices === 1 && row.void_invoices === 2 && row.invoice_total === row.payment_total, checks: [
        { label: "One active invoice remains", passed: row.active_invoices === 1, value: row.active_invoices },
        { label: "Two duplicate invoices are void", passed: row.void_invoices === 2, value: row.void_invoices },
        { label: "Invoice total equals payment total", passed: row.invoice_total === row.payment_total, value: row.invoice_total }
      ] };
    }
    if (id === "missing-appointments") {
      const row = db.prepare("SELECT COUNT(*) AS value FROM appointments WHERE id IN (3001,3002,3003) AND mobile_sync_status = 'queued'").get() as { value: number };
      return { passed: row.value === 3, checks: [{ label: "All affected appointments are queued", passed: row.value === 3, value: row.value }] };
    }
    if (id === "orphaned-patients") {
      const row = db.prepare("SELECT COUNT(*) AS value FROM patients WHERE id IN (4101,4102) AND quarantined = 1").get() as { value: number };
      return { passed: row.value === 2, checks: [{ label: "Unmapped patients are quarantined", passed: row.value === 2, value: row.value }] };
    }
    if (id === "wrong-client-payment") {
      const row = db.prepare("SELECT CASE WHEN p.client_id = i.client_id THEN 1 ELSE 0 END AS value FROM payments p JOIN invoices i ON i.payment_id=p.id WHERE p.id=6001").get() as { value: number };
      return { passed: row.value === 1, checks: [{ label: "Payment and invoice owners match", passed: row.value === 1, value: row.value }] };
    }
    const row = db.prepare("SELECT u.locked, SUM(CASE WHEN t.used_at IS NULL AND t.expires_at > datetime('now') THEN 1 ELSE 0 END) AS active FROM users u LEFT JOIN password_reset_tokens t ON t.user_id=u.id WHERE u.id=7001 GROUP BY u.locked").get() as { locked: number; active: number };
    return { passed: row.locked === 0 && row.active === 1, checks: [
      { label: "Account is unlocked", passed: row.locked === 0, value: row.locked },
      { label: "Exactly one active reset token", passed: row.active === 1, value: row.active }
    ] };
  };
  const reportFor = (id: string) => {
    const scenario = getScenario(id)!;
    const events = timeline(id);
    return [
      `# Investigation report: ${scenario.title}`,
      "",
      `Domain: ${scenario.domain}`,
      `Hypothesis: ${scenario.hypothesis}`,
      "",
      "## Activity",
      ...(events.length ? events.map((event) => `- ${event.type}: ${event.description} (${event.status}, ${event.affectedRows} rows)`) : ["- No investigation steps run yet."]),
      "",
      "## Safety constraints",
      ...scenario.safety.map((item) => `- ${item}`)
    ].join("\n");
  };
  const state = (id: string, result?: QueryResult, verification?: VerificationResult): ScenarioState | undefined => {
    const scenario = getScenario(id);
    if (!scenario) return undefined;
    const events = timeline(id);
    const currentVerification = verification ?? (events.some((event) => event.type === "repair") ? verify(id) : undefined);
    return {
      scenario,
      status: currentVerification?.passed ? "verified" : events.length ? "investigating" : "not_started",
      result,
      verification: currentVerification,
      timeline: events,
      report: reportFor(id)
    };
  };
  const log = (id: string, type: TimelineEvent["type"], description: string, beforeValue: string, afterValue: string, affectedRows: number, status: TimelineEvent["status"]) => {
    db.prepare("INSERT INTO investigation_events (scenario_id, occurred_at, type, description, before_value, after_value, affected_rows, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, new Date().toISOString(), type, description, beforeValue, afterValue, affectedRows, status);
  };

  return {
    db,
    reset: () => seedDatabase(db),
    list: () => scenarios.map((scenario) => state(scenario.id)!),
    get: (id) => state(id),
    runQuery: (id) => {
      const scenario = getScenario(id);
      if (!scenario) throw new Error("Scenario not found");
      const result = executeQuery(scenario.investigationSql);
      log(id, "query", "Ran allowlisted read-only investigation", "—", `${result.rowCount} rows`, result.rowCount, "completed");
      return state(id, result)!;
    },
    applyRepair: (id) => {
      const scenario = getScenario(id);
      if (!scenario) throw new Error("Scenario not found");
      const before = executeQuery(scenario.investigationSql).rowCount;
      let affectedRows = 0;
      try {
        const transaction = db.transaction(() => {
          if (id === "duplicate-invoices") affectedRows = db.prepare("UPDATE invoices SET status='void', void_reason='Duplicate invoice - webhook retry' WHERE id IN (10137,10138) AND payment_id=5021 AND status='open'").run().changes;
          else if (id === "missing-appointments") affectedRows = db.prepare("UPDATE appointments SET mobile_sync_status='queued' WHERE clinic_id=2 AND mobile_sync_status='failed' AND id IN (3001,3002,3003)").run().changes;
          else if (id === "orphaned-patients") affectedRows = db.prepare("UPDATE patients SET quarantined=1 WHERE id IN (4101,4102) AND quarantined=0").run().changes;
          else if (id === "wrong-client-payment") affectedRows = db.prepare("UPDATE payments SET client_id=(SELECT client_id FROM invoices WHERE payment_id=6001 LIMIT 1) WHERE id=6001 AND processor_reference='proc_demo_6001'").run().changes;
          else {
            affectedRows += db.prepare("UPDATE users SET locked=0 WHERE id=7001 AND email='client@example.test'").run().changes;
            affectedRows += db.prepare("UPDATE password_reset_tokens SET used_at=datetime('now') WHERE user_id=7001 AND used_at IS NULL").run().changes;
            affectedRows += db.prepare("INSERT INTO password_reset_tokens (id,user_id,token_digest,created_at,expires_at,used_at) VALUES (7102,7001,'synthetic_digest_not_a_secret',datetime('now'),datetime('now','+30 minutes'),NULL)").run().changes;
          }
          if (affectedRows !== scenario.expectedAffectedRows) throw new Error(`Expected ${scenario.expectedAffectedRows} affected rows, received ${affectedRows}`);
          const verification = verify(id);
          if (!verification.passed) throw new Error("Post-repair verification failed");
        });
        transaction();
      } catch (error) {
        log(id, "repair", "Guarded repair rolled back", String(before), String(before), affectedRows, "failed");
        throw error;
      }
      const verification = verify(id);
      log(id, "repair", "Applied allowlisted repair transaction", String(before), verification.passed ? "verified" : "failed", affectedRows, "completed");
      log(id, "verification", "Ran post-repair invariants", String(before), verification.passed ? "passed" : "failed", 0, verification.passed ? "completed" : "failed");
      return state(id, executeQuery(scenario.investigationSql), verification)!;
    }
  };
};
