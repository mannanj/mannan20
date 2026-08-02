import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
const configs = [config, config.env?.preview, config.env?.production];

for (const candidate of configs) {
  if (!candidate) throw new Error('Missing preview or production configuration.');
  const logs = candidate.observability?.logs;
  if (logs?.enabled !== false || logs?.invocation_logs !== false) {
    throw new Error(`Invocation/application logs are not disabled for ${candidate.name}.`);
  }
  const vars = candidate.vars ?? {};
  const forbidden = Object.keys(vars).filter((name) => /SECRET|TOKEN|PASSWORD|KEY/.test(name));
  if (forbidden.length > 0) {
    throw new Error(`Secret-like values must not be plain vars: ${forbidden.join(', ')}`);
  }
}

console.log('Privacy boundary verified: persisted logs disabled and no secret-like plain vars.');
