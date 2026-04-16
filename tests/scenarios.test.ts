import { describe, expect, it } from "vitest";
import { scenarios } from "../src/domain/scenarios";
import { createStore } from "../src/server/database";

describe("SQL lab scenarios", () => {
  it("documents five broken scenarios with investigations, repairs, and verification", () => {
    expect(scenarios).toHaveLength(5);
    for (const scenario of scenarios) {
      expect(scenario.investigationSql.toUpperCase()).toContain("SELECT");
      expect(scenario.repairSql.toUpperCase()).toContain("BEGIN TRANSACTION");
      expect(scenario.verificationSql.toUpperCase()).toContain("SELECT");
      expect(scenario.safety.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("repairs duplicate invoices without changing payment totals", () => {
    const store = createStore();
    const before = store.runQuery("duplicate-invoices");
    expect(before.result?.rowCount).toBe(9);
    const after = store.applyRepair("duplicate-invoices");
    expect(after.verification?.passed).toBe(true);
    const payment = store.db.prepare("SELECT amount_cents FROM payments WHERE id=5021").get() as { amount_cents: number };
    expect(payment.amount_cents).toBe(75000);
    store.db.close();
  });

  it("rolls all supported repair scenarios to their verified invariant", () => {
    const store = createStore();
    for (const scenario of scenarios) {
      store.runQuery(scenario.id);
      expect(store.applyRepair(scenario.id).verification?.passed).toBe(true);
    }
    store.db.close();
  });
});
