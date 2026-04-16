import type Database from "better-sqlite3";

export const seedDatabase = (db: Database.Database) => {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS investigation_events;
    DROP TABLE IF EXISTS password_reset_tokens;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS owner_mappings;
    DROP TABLE IF EXISTS patients;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS integrations;
    DROP TABLE IF EXISTS webhook_deliveries;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS clients;
    DROP TABLE IF EXISTS clinics;

    CREATE TABLE clinics (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE clients (id INTEGER PRIMARY KEY, clinic_id INTEGER NOT NULL, name TEXT NOT NULL);
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL, intent_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, webhook_event_key TEXT NOT NULL, processor_reference TEXT NOT NULL
    );
    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY, invoice_number TEXT NOT NULL, client_id INTEGER NOT NULL,
      payment_id INTEGER, total_cents INTEGER NOT NULL, status TEXT NOT NULL,
      created_at TEXT NOT NULL, void_reason TEXT
    );
    CREATE TABLE webhook_deliveries (
      id INTEGER PRIMARY KEY, event_key TEXT NOT NULL, attempt INTEGER NOT NULL,
      status TEXT NOT NULL, delivered_at TEXT NOT NULL
    );
    CREATE TABLE integrations (id INTEGER PRIMARY KEY, clinic_id INTEGER NOT NULL, kind TEXT NOT NULL, enabled INTEGER NOT NULL);
    CREATE TABLE appointments (
      id INTEGER PRIMARY KEY, clinic_id INTEGER NOT NULL, client_id INTEGER NOT NULL,
      starts_at TEXT NOT NULL, status TEXT NOT NULL, mobile_sync_status TEXT NOT NULL
    );
    CREATE TABLE patients (
      id INTEGER PRIMARY KEY, clinic_id INTEGER NOT NULL, name TEXT NOT NULL,
      source_owner_key TEXT NOT NULL, import_batch TEXT NOT NULL, quarantined INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE owner_mappings (source_owner_key TEXT PRIMARY KEY, client_id INTEGER NOT NULL);
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL, locked INTEGER NOT NULL);
    CREATE TABLE password_reset_tokens (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, token_digest TEXT NOT NULL,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT
    );
    CREATE TABLE investigation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id TEXT NOT NULL, occurred_at TEXT NOT NULL,
      type TEXT NOT NULL, description TEXT NOT NULL, before_value TEXT NOT NULL,
      after_value TEXT NOT NULL, affected_rows INTEGER NOT NULL, status TEXT NOT NULL
    );

    INSERT INTO clinics VALUES (1, 'Bayside Veterinary Clinic'), (2, 'Oakridge Animal Hospital'), (3, 'Pineview Vet Clinic');
    INSERT INTO clients VALUES (2057, 1, 'Jordan Lee'), (2058, 1, 'Morgan Patel'), (2059, 2, 'Casey Bell');
    INSERT INTO payments VALUES
      (5021, 2057, 'pi_demo_duplicate', 75000, 'evt_demo_retry', 'proc_demo_5021'),
      (6001, 2058, 'pi_demo_wrong_client', 12500, 'evt_demo_manual', 'proc_demo_6001');
    INSERT INTO invoices VALUES
      (10123, 'INV-2026-000981', 2057, 5021, 75000, 'paid', '2026-06-10T09:14:22Z', NULL),
      (10137, 'INV-2026-000995', 2057, 5021, 75000, 'open', '2026-06-10T09:14:36Z', NULL),
      (10138, 'INV-2026-000996', 2057, 5021, 75000, 'open', '2026-06-10T09:15:02Z', NULL),
      (10200, 'INV-2026-001010', 2059, 6001, 12500, 'paid', '2026-06-10T08:00:00Z', NULL);
    INSERT INTO webhook_deliveries VALUES
      (9301, 'evt_demo_retry', 1, 'delivered', '2026-06-10T09:14:22Z'),
      (9302, 'evt_demo_retry', 2, 'delivered', '2026-06-10T09:14:36Z'),
      (9303, 'evt_demo_retry', 3, 'delivered', '2026-06-10T09:15:02Z');
    INSERT INTO integrations VALUES (1, 2, 'mobile', 1);
    INSERT INTO appointments VALUES
      (3001, 2, 2059, '2026-06-11T09:00:00Z', 'booked', 'failed'),
      (3002, 2, 2059, '2026-06-11T10:00:00Z', 'booked', 'failed'),
      (3003, 2, 2059, '2026-06-11T11:00:00Z', 'booked', 'failed');
    INSERT INTO patients VALUES
      (4101, 3, 'Luna', 'legacy-owner-missing-1', 'import-2026-06', 0),
      (4102, 3, 'Max', 'legacy-owner-missing-2', 'import-2026-06', 0),
      (4103, 3, 'Bella', 'legacy-owner-ok', 'import-2026-06', 0);
    INSERT INTO owner_mappings VALUES ('legacy-owner-ok', 2057);
    INSERT INTO users VALUES (7001, 'client@example.test', 'synthetic_hash_not_a_password', 1);
    INSERT INTO password_reset_tokens VALUES
      (7101, 7001, 'expired_synthetic_digest', '2026-06-09T08:00:00Z', '2026-06-09T08:30:00Z', NULL);
  `);
};
