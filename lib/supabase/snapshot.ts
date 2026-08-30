import { calculateScore, readAssessment } from "@/lib/services";
import { createClient } from "./client";

const SNAPSHOT_KEY = "bynv-assessment";
const SNAPSHOT_ID_KEY = "bynv-snapshot-id";

export async function persistPendingVersionSnapshot(userId: string) {
  const answers = readAssessment(sessionStorage.getItem(SNAPSHOT_KEY));
  if (Object.keys(answers).length !== 6) return { saved: false, reason: "missing" as const };
  let clientSnapshotId = sessionStorage.getItem(SNAPSHOT_ID_KEY);
  if (!clientSnapshotId) {
    clientSnapshotId = crypto.randomUUID();
    sessionStorage.setItem(SNAPSHOT_ID_KEY, clientSnapshotId);
  }
  const result = calculateScore(answers);
  const { error } = await createClient().from("version_snapshots").upsert({
    user_id: userId,
    client_snapshot_id: clientSnapshotId,
    score: result.score,
    focus: result.focus,
    answers,
    area_results: result.areas,
    strongest_areas: result.strongestAreas.map((area) => area.key),
    opportunity_areas: result.opportunityAreas.map((area) => area.key),
    completed_at: new Date().toISOString(),
  }, { onConflict: "user_id,client_snapshot_id" });
  if (error) throw error;
  sessionStorage.removeItem(SNAPSHOT_KEY);
  sessionStorage.removeItem(SNAPSHOT_ID_KEY);
  return { saved: true, score: result.score };
}
