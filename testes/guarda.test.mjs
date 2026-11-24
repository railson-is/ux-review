// node --test testes/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARDA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'suporte', 'guardas', 'somente-leitura.mjs');

function decide(tool_name, tool_input) {
  const r = spawnSync(process.execPath, [GUARDA], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, tool_input }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  if (!r.stdout.trim()) return 'livre';
  return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision;
}

test('grava só na pasta da revisão e na memória', () => {
  assert.equal(decide('Write', { file_path: 'C:\\proj\\revisoes\\2026-11-24-exemplo\\relatorio.md' }), 'livre');
  assert.equal(decide('Write', { file_path: '/home/a/proj/revisoes/2026-11-24-exemplo/prints/x.png' }), 'livre');
  assert.equal(decide('Edit', { file_path: '/home/a/.claude/agent-memory/ux-review/MEMORY.md' }), 'livre');
  assert.equal(decide('Edit', { file_path: '/home/a/proj/src/App.jsx' }), 'deny');
  assert.equal(decide('Write', { file_path: '/home/a/proj/revisoes/notas.md' }), 'deny');
});

test('git e gh só para leitura', () => {
  assert.equal(decide('Bash', { command: 'git log --oneline -5' }), 'livre');
  assert.equal(decide('Bash', { command: 'gh pr view 12 -R dono/repo --json files' }), 'livre');
  assert.equal(decide('Bash', { command: 'gh pr diff 12 -R dono/repo' }), 'livre');
  assert.equal(decide('Bash', { command: 'gh api repos/dono/repo/contents/src/a.css?ref=abc -H "Accept: application/vnd.github.raw"' }), 'livre');
  assert.equal(decide('Bash', { command: 'gh api graphql -f query="query { viewer { login } }"' }), 'livre');
  assert.equal(decide('Bash', { command: 'gh pr checkout 12' }), 'deny');
  assert.equal(decide('Bash', { command: 'gh pr comment 12 --body "x"' }), 'deny');
  assert.equal(decide('Bash', { command: 'gh pr review 12 --approve' }), 'deny');
  assert.equal(decide('Bash', { command: 'gh issue create --title x' }), 'deny');
  assert.equal(decide('Bash', { command: 'gh api repos/dono/repo/issues -f title=x' }), 'deny');
  assert.equal(decide('Bash', { command: 'gh api -X DELETE repos/dono/repo/labels/x' }), 'deny');
  assert.equal(decide('Bash', { command: 'git checkout -b teste' }), 'deny');
  assert.equal(decide('Bash', { command: 'git commit -m "x"' }), 'deny');
});

test('escrita em disco fora da revisão é bloqueada', () => {
  assert.equal(decide('Bash', { command: 'mkdir -p revisoes/2026-11-24-exemplo/prints' }), 'livre');
  assert.equal(decide('Bash', { command: 'node revisoes/2026-11-24-exemplo/revisao.mjs 2>&1' }), 'livre');
  assert.equal(decide('Bash', { command: 'grep -n "<button>" src/App.jsx' }), 'livre');
  assert.equal(decide('Bash', { command: 'echo x > src/App.jsx' }), 'deny');
  assert.equal(decide('Bash', { command: "sed -i 's/a/b/' src/App.jsx" }), 'deny');
  assert.equal(decide('PowerShell', { command: 'Set-Content -Path src\\App.jsx -Value x' }), 'deny');
  assert.equal(decide('Bash', { command: 'npm install lodash' }), 'deny');
  assert.equal(decide('Bash', { command: 'cd ~/.claude/ux-review && npm ci' }), 'livre');
});

test('conectores só leem', () => {
  assert.equal(decide('mcp__figma__get_metadata', {}), 'livre');
  assert.equal(decide('mcp__abc123__get_screenshot', {}), 'livre');
  assert.equal(decide('mcp__abc123__create_session', {}), 'livre');
  assert.equal(decide('mcp__abc123__use_figma', {}), 'deny');
  assert.equal(decide('mcp__abc123__create_new_file', {}), 'deny');
  assert.equal(decide('mcp__abc123__weave_run_tool', {}), 'deny');
  assert.equal(decide('mcp__posthog__query-run', {}), 'livre');
  assert.equal(decide('mcp__posthog__dashboard-create', {}), 'deny');
  assert.equal(decide('mcp__github__add_issue_comment', {}), 'deny');
  assert.equal(decide('Read', { file_path: '/qualquer/lugar' }), 'livre');
});
