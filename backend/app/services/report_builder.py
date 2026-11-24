"""Port of server/services/reportBuilder.js — pure markdown generation."""
from app.services.decision_graph import build_coupling_graph
from app.services.decision_prioritizer import normalize_priority


def _priority_badge(p: str) -> str:
    badges = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "🟢"}
    return badges.get(normalize_priority(p), "⚪")


def _status_badge(s: str) -> str:
    return {"resolved": "✅", "skipped": "⏭️", "unresolved": "⬜"}.get(s, "⬜")


def _mermaid_coupling(graph: dict, direction: str = "TD") -> str:
    if not graph["nodes"]:
        return ""
    lines = [f"graph {direction}"]
    for n in graph["nodes"]:
        label = n["label"].replace('"', "'")
        lines.append(f'  {n["id"]}["{label}"]')
    for e in graph["edges"]:
        lines.append(f'  {e["source"]} -- "{e["weight"]} shared" --> {e["target"]}')
    return "```mermaid\n" + "\n".join(lines) + "\n```"


def build_report(project: dict, opts: dict | None = None) -> str:
    opts = opts or {}
    direction = opts.get("graphDirection", "TD")
    per_decision_prompts = opts.get("perDecisionPrompts") or {}
    readiness = opts.get("readiness") or project.get("readiness")

    analysis = project.get("analysis") or {}
    decisions = project.get("decisions") or []
    idea = project.get("idea", "")
    final_prompt = project.get("finalPrompt", "")
    title = project.get("title") or (analysis.get("product") or {}).get("name") or "Untitled Project"

    sections = []

    # Header
    sections.append(f"# {title}\n\n> {idea}\n")

    # Product
    product = analysis.get("product") or {}
    if product.get("description"):
        sections.append(f"## Product\n\n{product['description']}\n")

    goals = analysis.get("goals", "")
    if goals:
        sections.append(f"## Goals\n\n{goals}\n")

    # Requirements
    reqs = analysis.get("requirements") or []
    if reqs:
        sections.append("## Requirements\n\n" + "\n".join(f"- {r}" for r in reqs) + "\n")

    # Constraints
    constraints = analysis.get("constraints") or []
    if constraints:
        sections.append("## Constraints\n\n" + "\n".join(f"- {c}" for c in constraints) + "\n")

    # Quality Attributes
    qas = analysis.get("qualityAttributes") or []
    if qas:
        sections.append("## Quality Attributes\n\n" + "\n".join(f"- {q}" for q in qas) + "\n")

    # Readiness
    if readiness and isinstance(readiness, dict):
        total = readiness.get("totalImportantDecisions", 0)
        resolved = readiness.get("resolvedDecisions", 0)
        skipped = readiness.get("skippedDecisions", 0)
        ready = readiness.get("readyForGeneration", False)
        status_txt = "✅ Ready for implementation" if ready else "⚠️ Not ready — resolve critical decisions first"
        sections.append(f"## Readiness\n\n{status_txt}\n\n- Total important decisions: {total}\n- Resolved: {resolved}\n- Skipped: {skipped}\n")

    # Coupling graph
    if decisions:
        graph = build_coupling_graph(decisions)
        mermaid = _mermaid_coupling(graph, direction)
        if mermaid:
            sections.append(f"## Decision Coupling Graph\n\n{mermaid}\n")

    # Decisions
    if decisions:
        sections.append("## Engineering Decisions\n")
        for i, d in enumerate(decisions):
            if not d:
                continue
            t = d.get("title") or d.get("category") or f"Decision {i + 1}"
            priority = normalize_priority(d.get("priority") or d.get("importance"))
            status = d.get("status", "unresolved")
            pb = _priority_badge(priority)
            sb = _status_badge(status)
            sec = [f"### {sb} {t}\n\n{pb} **{priority}** · {status.capitalize()}\n"]

            if d.get("question"):
                sec.append(f"**Question:** {d['question']}\n")
            if status == "resolved" and d.get("chosen"):
                sec.append(f"**Chosen:** {d['chosen']}\n")
                if d.get("reasoning"):
                    sec.append(f"**Reasoning:** {d['reasoning']}\n")
            if d.get("tradeoffs"):
                sec.append(f"**Trade-offs:** {d['tradeoffs']}\n")
            if d.get("consequences"):
                sec.append(f"**Consequences:** {d['consequences']}\n")

            alts = d.get("alternatives") or []
            if alts:
                sec.append("**Alternatives considered:**\n")
                for a in alts:
                    name = a.get("name", "")
                    sec.append(f"- {name}")
                sec.append("")

            # Per-decision prompt
            d_id = d.get("_id") or f"d{i + 1}"
            if str(d_id) in per_decision_prompts:
                sec.append(f"**Implementation prompt:**\n\n> {per_decision_prompts[str(d_id)]}\n")

            sections.append("\n".join(sec))

    # Final prompt
    if final_prompt:
        sections.append(f"## Implementation Prompt\n\n```\n{final_prompt}\n```\n")

    return "\n---\n\n".join(sections)
