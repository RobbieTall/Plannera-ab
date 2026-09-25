import { pathToFileURL } from 'node:url';

// Inputs are boolean strings resolved by GitHub, never credential values.
export function presenceSummary(env) {
  const values = [env.DATABASE_CONFIGURED, env.SESSION_CONFIGURED];
  if (!values.every(value => value === 'true' || value === 'false')) {
    throw new Error('presence_input_invalid');
  }
  return { databaseConfigured: values[0] === 'true', sessionConfigured: values[1] === 'true' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = presenceSummary(process.env);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.databaseConfigured && result.sessionConfigured ? 0 : 1;
  } catch {
    process.stdout.write('Presence probe refused invalid boolean inputs.\n');
    process.exitCode = 1;
  }
}
