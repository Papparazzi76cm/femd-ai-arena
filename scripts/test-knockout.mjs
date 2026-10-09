import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'knockout-tests-'));
try {
  const output = join(directory, 'tests.cjs');
  await build({ entryPoints: ['tests/knockoutResolver.test.ts'], bundle: true, platform: 'node', outfile: output, plugins: [{ name: 'mock-database', setup(builder) { builder.onResolve({ filter: /^@\/lib\/matchDateTime$/ }, () => ({ path: join(process.cwd(), 'src/lib/matchDateTime.ts') })); builder.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: join(process.cwd(), 'tests/supabaseMock.ts') })); } }] });
  const run = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
