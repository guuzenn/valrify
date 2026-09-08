export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 80;

export type SearchQuery =
  | { kind: "idle"; query: "" }
  | { kind: "invalid"; query: string; message: string }
  | { kind: "valid"; query: string };

export type SearchViewState = "idle" | "invalid" | "empty" | "found";

export function parseSearchQuery(rawQuery: string): SearchQuery {
  const query = rawQuery.trim().replace(/\s+/g, " ");

  if (!query) return { kind: "idle", query: "" };
  if (query.length < SEARCH_QUERY_MIN_LENGTH) {
    return { kind: "invalid", query, message: "Ketik minimal dua karakter agar pencarian dapat dilakukan." };
  }
  if (query.length > SEARCH_QUERY_MAX_LENGTH) {
    return { kind: "invalid", query, message: `Pencarian maksimal ${SEARCH_QUERY_MAX_LENGTH} karakter. Periksa kembali data yang ditempel.` };
  }

  return { kind: "valid", query };
}

export function getSearchViewState(search: SearchQuery, resultCount: number): SearchViewState {
  if (search.kind !== "valid") return search.kind;
  return resultCount > 0 ? "found" : "empty";
}
