export interface LabScenario {
  id: string;
  title: string;
  domain: string;
  symptom: string;
  hypothesis: string;
  safety: string[];
  investigationSteps: string[];
  investigationSql: string;
  repairSql: string;
  verificationSql: string;
  expectedAffectedRows: number;
}

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
  elapsedMs: number;
}

export interface VerificationResult {
  passed: boolean;
  checks: Array<{ label: string; passed: boolean; value: string | number }>;
}

export interface TimelineEvent {
  id: number;
  scenarioId: string;
  occurredAt: string;
  type: "query" | "repair" | "verification";
  description: string;
  beforeValue: string;
  afterValue: string;
  affectedRows: number;
  status: "completed" | "failed";
}

export interface ScenarioState {
  scenario: LabScenario;
  status: "not_started" | "investigating" | "verified";
  result?: QueryResult;
  verification?: VerificationResult;
  timeline: TimelineEvent[];
  report: string;
}
