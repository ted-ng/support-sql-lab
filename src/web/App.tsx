import { CheckCircle2, Database, FileText, FlaskConical, Play, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ScenarioState } from "../domain/types";
import { api } from "./api";

const statusLabel = (status: ScenarioState["status"]) => status.replace("_", " ");

export function App() {
  const [states, setStates] = useState<ScenarioState[]>([]);
  const [selectedId, setSelectedId] = useState("duplicate-invoices");
  const [notice, setNotice] = useState("");
  const selected = useMemo(() => states.find((state) => state.scenario.id === selectedId) ?? states[0], [states, selectedId]);

  useEffect(() => {
    let active = true;
    void api.scenarios().then((items) => { if (active) setStates(items); });
    return () => { active = false; };
  }, []);
  const replaceState = (next: ScenarioState) => setStates((current) => current.map((state) => state.scenario.id === next.scenario.id ? next : state));
  const runQuery = async () => {
    if (!selected) return;
    const next = await api.query(selected.scenario.id);
    replaceState(next);
    setNotice(`Investigation returned ${next.result?.rowCount ?? 0} rows.`);
  };
  const applyRepair = async () => {
    if (!selected) return;
    try {
      const next = await api.repair(selected.scenario.id);
      replaceState(next);
      setNotice(next.verification?.passed ? "Repair committed and verification passed." : "Repair completed without verification.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Repair failed and was rolled back.");
    }
  };
  const reset = async () => {
    await api.reset();
    setStates(await api.scenarios());
    setSelectedId("duplicate-invoices");
    setNotice("Disposable database restored.");
  };

  return (
    <div className="shell">
      <nav className="rail">
        <div className="brand"><FlaskConical size={23} /><span><strong>Support SQL Lab</strong><small>Safe investigation environment</small></span></div>
        <h1>Scenarios</h1>
        {states.map((state, index) => (
          <button className={state.scenario.id === selected?.scenario.id ? "selected" : ""} key={state.scenario.id} onClick={() => {
            setSelectedId(state.scenario.id);
            setNotice("");
          }}>
            <b>{index + 1}</b><span><strong>{state.scenario.title}</strong><small>{state.scenario.domain}</small><em>{statusLabel(state.status)}</em></span>
          </button>
        ))}
        <p className="about">Disposable SQLite data with allowlisted investigations, guarded repair transactions, and post-repair verification.</p>
      </nav>
      <header className="topbar">
        <Database size={15} /><span>Database: <strong>support-lab.sqlite</strong></span><em>Seeded & disposable</em>
        <button onClick={() => void reset()}><RotateCcw size={15} /> Reset lab</button>
      </header>
      {selected ? (
        <main className="workspace">
          <section className="summary">
            <div><h2>{selected.scenario.title}</h2><span className={`status ${selected.status}`}>{statusLabel(selected.status)}</span></div>
            <p>{selected.scenario.symptom}</p>
            <small>{selected.scenario.domain}</small>
          </section>
          <div className="body-grid">
            <section className="workbench">
              <div className="steps">{selected.scenario.investigationSteps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}</div>
              <div className="editor-heading"><strong>investigation.sql</strong><button onClick={() => void runQuery()}><Play size={15} /> Run query</button></div>
              <pre className="sql">{selected.scenario.investigationSql}</pre>
              <section className="results">
                <div><strong>Results</strong><span>{selected.result ? `${selected.result.rowCount} rows · ${selected.result.elapsedMs} ms` : "Run the read-only investigation"}</span></div>
                {selected.result ? (
                  <div className="table-wrap"><table><thead><tr>{selected.result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                    <tbody>{selected.result.rows.map((row, index) => <tr key={index}>{selected.result!.columns.map((column) => <td key={column}>{String(row[column] ?? "NULL")}</td>)}</tr>)}</tbody>
                  </table></div>
                ) : <p className="empty">No query results yet.</p>}
              </section>
            </section>
            <aside className="repair">
              <h3>Investigation & repair</h3>
              <h4>Current hypothesis</h4><p>{selected.scenario.hypothesis}</p>
              <h4>Safe repair checklist</h4><ul>{selected.scenario.safety.map((item) => <li key={item}><ShieldCheck size={14} /> {item}</li>)}</ul>
              <h4>Proposed repair preview</h4><pre>{selected.scenario.repairSql}</pre>
              <button className="repair-button" disabled={!selected.result || selected.status === "verified"} onClick={() => void applyRepair()}><Wrench size={16} /> Apply guarded repair</button>
              <small>Runs once in a transaction and rolls back unless verification passes.</small>
              <div className={`verification ${selected.verification?.passed ? "passed" : ""}`}>
                <h4>Post-repair verification</h4>
                {selected.verification ? selected.verification.checks.map((check) => <p key={check.label}>{check.passed ? <CheckCircle2 size={14} /> : null}{check.label}: {check.value}</p>) : <p>Not run yet.</p>}
              </div>
            </aside>
          </div>
          <section className="timeline">
            <div><h3>Investigation report timeline</h3><button onClick={() => setNotice("Report preview is available below.")}><FileText size={15} /> Preview report</button></div>
            <table><thead><tr><th>Type</th><th>Description</th><th>Before</th><th>After</th><th>Rows</th><th>Status</th></tr></thead>
              <tbody>{selected.timeline.length ? selected.timeline.map((event) => <tr key={event.id}><td>{event.type}</td><td>{event.description}</td><td>{event.beforeValue}</td><td>{event.afterValue}</td><td>{event.affectedRows}</td><td>{event.status}</td></tr>) : <tr><td colSpan={6}>No activity recorded.</td></tr>}</tbody>
            </table>
            <details><summary>Generated Markdown report</summary><pre>{selected.report}</pre></details>
            <p className="notice" role="status">{notice}</p>
          </section>
        </main>
      ) : <main className="workspace empty">Loading seeded SQL lab…</main>}
    </div>
  );
}
