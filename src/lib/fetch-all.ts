/**
 * De database geeft per verzoek maximaal 1000 rijen terug. Deze helper haalt
 * alle rijen op in pagina's. `build` moet bij elke aanroep een nieuwe query
 * teruggeven (met een vaste sortering voor stabiele paginering).
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
