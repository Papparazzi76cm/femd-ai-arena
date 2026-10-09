export const database = { matches: [] as any[], event_teams: [] as any[], fail: false, writes: 0 };
export const supabase = {
  from(table: 'matches' | 'event_teams') {
    let filters: Array<(row: any) => boolean> = [];
    let patch: any;
    let single = false;
    let bounds: [number, number] | undefined;
    const query: any = {
      select() { return query; },
      order() { return query; },
      range(from: number, to: number) { bounds = [from, to]; return query; },
      update(value: any) { patch = value; return query; },
      eq(key: string, value: any) { filters.push(row => row[key] === value); return query; },
      is(key: string, value: any) { filters.push(row => (row[key] ?? null) === value); return query; },
      single() { single = true; return query; },
      then(resolve: any, reject: any) {
        if (database.fail) return Promise.resolve({ data: null, error: new Error('database failed') }).then(resolve, reject);
        let rows = database[table].filter(row => filters.every(f => f(row)));
        if (bounds) rows = rows.slice(bounds[0], bounds[1] + 1);
        if (patch) { rows.forEach(row => Object.assign(row, patch)); database.writes += rows.length; }
        return Promise.resolve({ data: single ? { ...rows[0] } : rows.map(row => ({ ...row })), error: null }).then(resolve, reject);
      },
    };
    return query;
  },
};
