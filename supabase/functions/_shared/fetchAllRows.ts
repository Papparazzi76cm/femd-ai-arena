/** Read every page without assuming the server's configured row limit. */
export async function fetchAllRows<T>(
  query: () => {
    order(column: string): { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> };
  },
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    // A unique final ordering key prevents rows being skipped when dates/numbers tie.
    const { data, error } = await query().order('id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
    // Continue even on a short page: the server may cap requests below pageSize.
    offset += data.length;
  }
}
