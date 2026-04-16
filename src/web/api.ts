import type { ScenarioState } from "../domain/types";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(((await response.json()) as { message?: string }).message ?? "Request failed");
  return response.json() as Promise<T>;
};

export const api = {
  scenarios: () => request<ScenarioState[]>("/api/scenarios"),
  query: (id: string) => request<ScenarioState>(`/api/scenarios/${id}/query`, { method: "POST", body: "{}" }),
  repair: (id: string) => request<ScenarioState>(`/api/scenarios/${id}/repair`, { method: "POST", body: "{}" }),
  reset: () => request<{ status: string }>("/api/reset", { method: "POST", body: "{}" })
};
