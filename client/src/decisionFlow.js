/**
 * decisionFlow.js - Client-side mirror of server/services/decisionFlow.js.
 *
 * Pure deterministic decision-flow logic for the interactive one-at-a-time
 * UI. NO LLM calls. Runs in the browser.
 *
 * Public API (mirror of server):
 *   - computeFlowState(decisions)  → { current, upcoming, resolved, skipped }
 *   - computeNextDecision(decisions) → single decision or null
 *   - markResolved(decisions, title, chosen, reasoning)
 *   - markSkipped(decisions, title, reason)
 *   - recordClarifyingAnswers(decision, answers)
 *   - shouldSuggestClarify(decision)
 *   - summarizeProgress(decisions)
 */

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function normalizePriority(v) {
  if (typeof v !== "string") return "Medium";
  const norm = v.trim();
  if (norm === "Critical" || norm === "High" || norm === "Medium" || norm === "Low") return norm;
  // Legacy aliases: "Important" → "High"; "Optional" → "Low"; "Mandatory" → "Critical"
  if (/critical|essential|mandatory/i.test(norm)) return "Critical";
  if (/high|major|important/i.test(norm)) return "High";
  if (/medium|moderate|standard/i.test(norm)) return "Medium";
  return "Medium";
}

function resolvedTitles(decisions) {
  if (!Array.isArray(decisions)) return new Set();
  const out = new Set();
  for (const d of decisions) {
    if (!d) continue;
    const title = d.title || d.category || "";
    if (d.status === "resolved" && title) out.add(title);
  }
  return out;
}

function skippedTitles(decisions) {
  if (!Array.isArray(decisions)) return new Set();
  const out = new Set();
  for (const d of decisions) {
    if (!d) continue;
    const title = d.title || d.category || "";
    if (d.status === "skipped" && title) out.add(title);
  }
  return out;
}

function computeSkippedByDependency(candidates, skippedSet) {
  const skipped = new Set(skippedSet);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of candidates) {
      if (!d) continue;
      const title = d.title || d.category || "";
      if (!title || skipped.has(title)) continue;
      const deps = Array.isArray(d.dependsOn) ? d.dependsOn : [];
      if (deps.some((dep) => skipped.has(dep))) {
        skipped.add(title);
        changed = true;
      }
    }
  }
  return skipped;
}

export function computeFlowState(decisions) {
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return { current: null, upcoming: [], resolved: [], skipped: [], unknown: [], total: 0 };
  }
  const explicitSkipped = skippedTitles(decisions);
  const implicitSkipped = computeSkippedByDependency(decisions, explicitSkipped);

  const resolved = [];
  const skipped = [];
  const ready = [];
  const unknown = [];

  for (const d of decisions) {
    if (!d) continue;
    const title = d.title || d.category || "";
    const status = d.status;
    if (status === "resolved" && title) resolved.push(d);
    else if (implicitSkipped.has(title)) skipped.push({ ...d, status: "skipped" });
    else if (status === "unresolved" || !status) ready.push(d);
    else unknown.push(d);
  }

  const sortedReady = ready
    .map((d, idx) => ({ d, idx }))
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[normalizePriority(a.d.priority ?? a.d.importance)] ?? 2;
      const pb = PRIORITY_ORDER[normalizePriority(b.d.priority ?? b.d.importance)] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.idx - b.idx;
    })
    .map(({ d }) => d);

  return {
    current: sortedReady[0] || null,
    upcoming: sortedReady.slice(1),
    resolved,
    skipped,
    unknown,
    total: decisions.length,
  };
}

export function computeNextDecision(decisions) {
  return computeFlowState(decisions).current;
}

export function markSkipped(decisions, title, reason) {
  if (!Array.isArray(decisions) || !title) return decisions;
  const tilted = decisions.map((d) => {
    if (!d) return d;
    if ((d.title || d.category) === title) {
      return {
        ...d,
        status: "skipped",
        chosen: "",
        reasoning: reason ?? d.reasoning ?? "",
      };
    }
    return d;
  });
  const explicitSkipped = skippedTitles(tilted);
  const closed = computeSkippedByDependency(tilted, explicitSkipped);
  return tilted.map((d) => {
    const t = d?.title || d?.category || "";
    if (!t) return d;
    if (closed.has(t) && d.status !== "resolved" && d.status !== "skipped") {
      return { ...d, status: "skipped" };
    }
    return d;
  });
}

export function markResolved(decisions, title, chosen, reasoning) {
  if (!Array.isArray(decisions) || !title) return decisions;
  return decisions.map((d) => {
    if (!d) return d;
    if ((d.title || d.category) !== title) return d;
    return {
      ...d,
      status: "resolved",
      chosen: chosen || d.chosen || "",
      reasoning: reasoning ?? d.reasoning ?? "",
    };
  });
}

export function recordClarifyingAnswers(decision, answers) {
  if (!decision || typeof decision !== "object") return decision;
  if (!Array.isArray(answers)) return decision;
  return {
    ...decision,
    clarifyingAnswers: answers.map((a) => ({
      question: a.question || "",
      answer: a.answer || "",
    })),
  };
}

export function shouldSuggestClarify(decision) {
  if (!decision || typeof decision !== "object") return false;
  if (Array.isArray(decision.missingInfo) && decision.missingInfo.length >= 2) return true;
  if (Array.isArray(decision.clarifyingQuestions) && decision.clarifyingQuestions.length >= 2) return true;
  return false;
}

export function summarizeProgress(decisions) {
  if (!Array.isArray(decisions)) {
    return { total: 0, resolved: 0, unresolved: 0, skipped: 0, filtered: 0, progress: "" };
  }
  let total = decisions.length;
  let resolved = 0;
  let unresolved = 0;
  let skipped = 0;
  let filtered = 0;
  for (const d of decisions) {
    if (!d) continue;
    if (d.status === "resolved") resolved++;
    else if (d.status === "unresolved") unresolved++;
    else if (d.status === "skipped") skipped++;
    else if (d.status === "filtered_out") filtered++;
  }
  const actionTotal = resolved + unresolved + skipped;
  const pct = actionTotal === 0 ? 0 : Math.round((resolved + skipped) * 100 / actionTotal);
  const progress = actionTotal === 0 ? "" : `${resolved + skipped} of ${actionTotal} (${pct}%)`;
  return { total, resolved, unresolved, skipped, filtered, progress };
}
