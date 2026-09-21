import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'server', 'apps'];
const forbidden = [
  /\b(?:jest|vitest)\.fn\s*\(/i,
  /\b(?:mock|fake|stub)(?:Response|Telemetry|Data)\b/i,
  /\bDEMO_SYNTHETIC\b/i,
  /\bMath\.random\s*\(\s*\)/i,
];
const testPath = /(?:\.test\.|\.spec\.|__tests__|fixtures?|mocks?)/i;
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) files.push(file);
  }
}

roots.forEach(walk);
const findings = [];
for (const file of files) {
  if (testPath.test(file)) continue;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (forbidden.some((rx) => rx.test(line))) findings.push(file + ':' + (i + 1) + ': ' + line.trim());
  });
}

if (findings.length) {
  console.error('ANTI-MOCK GATE FAILED');
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('ANTI-MOCK GATE PASSED: ' + files.length + ' production source files scanned');
