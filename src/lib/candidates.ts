export type RoleCandidatesMap = Record<string, string[]>;

/**
 * Parse candidates_json from the DB, handling both legacy (string[])
 * and new (Record<string, string[]>) formats.
 *
 * Returns a map keyed by role name. If the stored value is a flat array,
 * every role receives that same list.
 */
export function parseRoleCandidates(
  candidatesJson: string | null,
  roles: string[]
): RoleCandidatesMap | null {
  if (!candidatesJson) return null;
  const parsed: unknown = JSON.parse(candidatesJson);

  if (Array.isArray(parsed)) {
    const list = parsed.filter(
      (c): c is string => typeof c === "string" && c.trim() !== ""
    );
    if (!list.length) return null;
    const map: RoleCandidatesMap = {};
    for (const role of roles) {
      map[role] = list;
    }
    return map;
  }

  if (parsed && typeof parsed === "object") {
    return parsed as RoleCandidatesMap;
  }

  return null;
}

/**
 * Serialize a RoleCandidatesMap to JSON for storage.
 * If every role has the exact same candidate list, store as a flat array
 * for backward compatibility.
 */
export function serializeRoleCandidates(map: RoleCandidatesMap): string {
  const lists = Object.values(map);
  const allSame =
    lists.length > 0 &&
    lists.every((list) => JSON.stringify(list) === JSON.stringify(lists[0]));
  if (allSame && lists.length > 0) {
    return JSON.stringify(lists[0]);
  }
  return JSON.stringify(map);
}
