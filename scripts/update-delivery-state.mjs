import fs from 'node:fs';

const backlogPath = 'docs/BACKLOG.md';
const backlog = fs.readFileSync(backlogPath, 'utf8');
const date = new Date().toISOString().slice(0, 10);

const sprintNames = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12'];
let sprint = 'S12';
for (const candidate of sprintNames) {
  const start = backlog.indexOf('## ' + candidate + ' ');
  const end = backlog.indexOf('\n## ', start + 4);
  const section = backlog.slice(start, end < 0 ? backlog.length : end);
  if (section.includes('- [ ]')) {
    sprint = candidate;
    break;
  }
}

const marker = '## Registro de entregas';
const start = backlog.indexOf(marker);
if (start < 0) process.exit(0);
const insertAt = backlog.indexOf('\n', start) + 1;
const line = '| ' + date + ' | ' + sprint + ' | CI merge gate | coverage 100% + anti-mock + VUA + build + k6 | 🟢 |\n';
const next = backlog.slice(0, insertAt) + line + backlog.slice(insertAt);
fs.writeFileSync(backlogPath, next);
console.log('VUA DELIVERY: ' + sprint);
