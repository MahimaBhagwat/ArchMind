"""Port of server/services/decisionGraph.js — pure deterministic logic."""


def _norm(s) -> str:
    return s.strip().lower() if isinstance(s, str) else ""


def _index_decision(d: dict) -> dict:
    reqs = set(_norm(r) for r in (d.get("relatedRequirements") or []) if _norm(r))
    qas = set(_norm(q) for q in (d.get("relatedQualityAttributes") or []) if _norm(q))
    return {"reqs": reqs, "qas": qas}


def _compute_overlap(a: dict, b: dict) -> dict:
    shared_reqs = [r for r in a["reqs"] if r in b["reqs"] and r]
    shared_qas = [q for q in a["qas"] if q in b["qas"] and q]
    return {"count": len(shared_reqs) + len(shared_qas), "sharedRequirements": shared_reqs, "sharedQualityAttributes": shared_qas}


def _category_of(d: dict) -> str:
    title = (d.get("title") or d.get("category") or "").lower()
    if any(w in title for w in ["auth", "login", "session", "identity"]):
        return "security"
    if any(w in title for w in ["data", "database", "storage", "persist"]):
        return "data"
    if any(w in title for w in ["api", "backend", "server", "endpoint"]):
        return "api"
    if any(w in title for w in ["front", "ui", "client", "react", "view"]):
        return "frontend"
    return "other"


def _node_id(d: dict, i: int) -> str:
    t = (d.get("title") or d.get("category") or "").strip()
    if t:
        return t.lower().replace(" ", "_")[:40]
    return f"d{i}"


def build_coupling_graph(decisions: list, min_weight: int = 1) -> dict:
    safe = decisions if isinstance(decisions, list) else []
    indexed = [{"d": d, **_index_decision(d)} for d in safe]

    nodes = [
        {
            "id": _node_id(d, i),
            "label": d.get("title") or d.get("category") or f"Decision {i + 1}",
            "importance": d.get("importance", "Medium"),
            "status": d.get("status", "unresolved"),
            "blastRadius": d.get("blastRadius", "Module"),
            "category": _category_of(d),
            "chosen": d.get("chosen") or None,
            "requirementCount": len(d.get("relatedRequirements") or []),
            "qualityAttributeCount": len(d.get("relatedQualityAttributes") or []),
        }
        for i, d in enumerate(safe)
    ]

    edges = []
    for i in range(len(indexed)):
        for j in range(i + 1, len(indexed)):
            overlap = _compute_overlap(indexed[i], indexed[j])
            if overlap["count"] >= min_weight:
                edges.append({
                    "source": _node_id(indexed[i]["d"], i),
                    "target": _node_id(indexed[j]["d"], j),
                    "weight": overlap["count"],
                    "sharedRequirements": overlap["sharedRequirements"],
                    "sharedQualityAttributes": overlap["sharedQualityAttributes"],
                })

    return {"nodes": nodes, "edges": edges, "metadata": {"nodeCount": len(nodes), "edgeCount": len(edges), "minWeight": min_weight}}
