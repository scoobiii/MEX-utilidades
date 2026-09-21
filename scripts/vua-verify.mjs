import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'vua/manifest.json',
  'vua/policy/quality-gates.json',
  'vitest.config.ts',
  'tests/businessRules.test.ts',
  'k6/smoke.js',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('VUA VERIFY: missing required artifacts:', missing.join(', '));
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vua/manifest.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(root, 'vua/policy/quality-gates.json'), 'utf8'));

const coverageFile = path.join(root, 'coverage/coverage-summary.json');
if (!fs.existsSync(coverageFile)) {
  console.error('VUA VERIFY: coverage/coverage-summary.json not found. Run npm run coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8')).total;
const metrics = ['lines', 'statements', 'functions', 'branches'];
const failures = metrics
  .filter((metric) => Number(coverage[metric]?.pct) !== 100)
  .map((metric) => `${metric}=${coverage[metric]?.pct}`);

if (failures.length) {
  console.error('VUA VERIFY: 100% domain coverage gate failed:', failures.join(', '));
  process.exit(1);
}

const governanceOk = Object.values(manifest.governance).every(Boolean);
const policyOk = policy.merge.required.length >= 5;
if (!governanceOk || !policyOk) {
  console.error('VUA VERIFY: governance/policy contract failed');
  process.exit(1);
}

const evidence = {
  profile: manifest.profile,
  verifiedAt: new Date().toISOString(),
  status: 'VERIFIED',
  coverage: Object.fromEntries(metrics.map((metric) => [metric, coverage[metric].pct])),
  gates: {
    governance: governanceOk,
    policy: policyOk,
    coverage100: true,
  },
};

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'artifacts/vua-verification.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);

console.log('VUA VERIFY: VERIFIED');
console.log(JSON.stringify(evidence, null, 2));
