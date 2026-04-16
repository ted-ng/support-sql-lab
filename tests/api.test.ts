import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app";
import { createStore } from "../src/server/database";

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()?.(); });

describe("SQL lab API", () => {
  it("serves five seeded scenarios without accepting arbitrary SQL", async () => {
    const store = createStore();
    const app = await buildApp(store);
    cleanups.push(() => app.close(), () => { store.db.close(); });
    const response = await app.inject({ method: "GET", url: "/api/scenarios" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(5);
    const arbitrary = await app.inject({ method: "POST", url: "/api/query", payload: { sql: "DROP TABLE clinics" } });
    expect(arbitrary.statusCode).toBe(404);
  });

  it("runs an allowlisted query then a guarded repair", async () => {
    const store = createStore();
    const app = await buildApp(store);
    cleanups.push(() => app.close(), () => { store.db.close(); });
    const query = await app.inject({ method: "POST", url: "/api/scenarios/duplicate-invoices/query", payload: {} });
    expect(query.statusCode).toBe(200);
    expect(query.json().result.rowCount).toBe(9);
    const repair = await app.inject({ method: "POST", url: "/api/scenarios/duplicate-invoices/repair", payload: {} });
    expect(repair.statusCode).toBe(200);
    expect(repair.json().verification.passed).toBe(true);
  });
});
