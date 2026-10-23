import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const checks = [
  'tests/auth-ui-check.mjs', 'tests/setup-browser-check.mjs',
  'tests/settings-fit-check.mjs', 'tests/profile-browser-check.mjs',
  'tests/themes-browser-check.mjs', 'tests/responsive-check.mjs',
  'tests/friends-panel-check.mjs', 'tests/friends-fit-check.mjs',
  'tests/audio-browser-check.mjs', 'tests/asset-cleanup-check.mjs',
  'tests/online-browser-check.mjs',
];
let front;
try {
  if (process.env.COMIND_BROWSER_USE_RUNNING !== 'true') {
    front = await createServer({ root, server: { host: '127.0.0.1', port: 5174, strictPort: true }, logLevel: 'error' });
    await front.listen();
  }
  for (const script of checks) {
    console.log(`\nBrowser check: ${script}`);
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(new URL(`../${script}`, import.meta.url))], { cwd: root, stdio: 'inherit', env: process.env });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${script} failed (${code})`)));
    });
  }
} finally { await front?.close(); }
