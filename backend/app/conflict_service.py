"""
Conflict of Interest Detection Service
Fuzzy name matching, search, and clearance workflows
"""
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from app.legal_models import Conflict, Client, Matter


def fuzzy_match(search_name: str, candidates: list, threshold: float = 0.8) -> list:
    """
    Returns candidates above similarity threshold (0.0-1.0).
    Examples:
      - "John Smith" vs "JOHN SMITH" → match (100%)
      - "John Smith" vs "Jon Smith" → match (95%)
      - "John Smith" vs "John Smythe" → match (90%)
      - "John Smith" vs "Jane Doe" → no match
    """
    matches = []
    for candidate in candidates:
        if not candidate:
            continue
        ratio = SequenceMatcher(
            None,
            search_name.lower().strip(),
            candidate.lower().strip()
        ).ratio()
        if ratio >= threshold:
            matches.append((candidate, ratio))
    return sorted(matches, key=lambda x: x[1], reverse=True)


def search_potential_conflicts(
    db: Session,
    client_id: int,
    opposing_party_name: str,
    opposing_counsel_name: str
) -> dict:
    """
    Search for conflicts by:
    1. Fuzzy-matching opposing_party_name against all existing clients
    2. Fuzzy-matching opposing_counsel_name against existing opposing parties
    3. Checking existing uncleared conflicts for this client

    Returns: {
      "potential_conflicts": [
        { "type": "client_match", "name": "...", "similarity": 0.95, "client_id": 5 },
        { "type": "opposing_party_match", "name": "...", "similarity": 0.90 },
        { "type": "opposing_counsel_match", "name": "...", "similarity": 0.88 }
      ],
      "existing_uncleared": [
        { "id": 1, "status": "raised", "reason": "...", "opposing_name": "..." }
      ]
    }
    """

    potential_conflicts = []

    # Search 1: Opposing party vs existing clients
    if opposing_party_name:
        all_clients = db.query(Client).filter(Client.is_active == True).all()
        candidate_names = []
        client_map = {}
        for c in all_clients:
            display = c.display_name
            if display:
                candidate_names.append(display)
                client_map[display] = c.id

        matches = fuzzy_match(opposing_party_name, candidate_names, threshold=0.80)
        for matched_name, similarity in matches:
            potential_conflicts.append({
                "type": "client_match",
                "name": matched_name,
                "similarity": round(similarity, 2),
                "client_id": client_map[matched_name]
            })

    # Search 2: Opposing counsel vs existing opposing parties in matters
    if opposing_counsel_name:
        matters = db.query(Matter).filter(
            Matter.opposing_counsel.isnot(None),
            Matter.opposing_counsel != ""
        ).all()
        counsel_names = [m.opposing_counsel for m in matters if m.opposing_counsel]
        counsel_names = list(set(counsel_names))  # deduplicate

        matches = fuzzy_match(opposing_counsel_name, counsel_names, threshold=0.80)
        for matched_name, similarity in matches:
            potential_conflicts.append({
                "type": "opposing_counsel_match",
                "name": matched_name,
                "similarity": round(similarity, 2)
            })

    # Search 3: Existing uncleared conflicts for this client
    existing_uncleared = db.query(Conflict).filter(
        Conflict.client_id == client_id,
        Conflict.status.in_(["raised", "under_review"])
    ).all()

    uncleared_list = [
        {
            "id": c.id,
            "status": c.status,
            "opposing_name": c.opposing_name,
            "opposing_counsel_name": c.opposing_counsel_name,
            "reason": c.reason,
            "risk_level": c.risk_level
        }
        for c in existing_uncleared
    ]

    return {
        "potential_conflicts": potential_conflicts,
        "existing_uncleared": uncleared_list
    }
