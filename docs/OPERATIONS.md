# Operations

## Safety model

The API maps scenario IDs to repository-owned SQL. It does not accept SQL text from the browser. Repairs run inside transactions and are rolled back when:

- the scenario does not exist;
- the affected-row count differs from the expected value;
- a post-repair invariant fails;
- SQLite raises an error.

## Investigation sequence

1. Reset the disposable lab.
2. Read the symptom, hypothesis, and safety checklist.
3. Run the read-only investigation.
4. Confirm returned IDs and expected affected-row count.
5. Review the repair preview.
6. Apply the guarded repair.
7. Confirm every verification check and timeline entry.

## Recovery

The database is disposable and synthetic:

```bash
rm -f data/support-lab.sqlite*
npm run seed
```

## Production adaptation checklist

- Replace fixture IDs with parameters resolved from a reviewed incident.
- Use database-native row locking and transaction isolation.
- Require operator identity and approval.
- Capture a backup or reversible before-state.
- Add a hard statement timeout.
- Restrict database credentials to the minimum necessary permissions.
- Redact customer data from logs and reports.
