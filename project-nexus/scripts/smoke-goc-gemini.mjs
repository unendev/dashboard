/**
 * Smoke test for /api/goc-chat with Gemini.
 *
 * Why this exists:
 * - `npm run dev` uses scripts/start-dev.mjs which auto-selects a free port in [10000..10009].
 * - This script will probe that port range and then send a minimal request to /api/goc-chat.
 *
 * Usage:
 *   node scripts/smoke-goc-gemini.mjs
 *   PORT=10002 node scripts/smoke-goc-gemini.mjs
 *
 * Notes:
 * - Requires dev server already running.
 * - Requires your env vars to be set correctly for Gemini to work (e.g. GOOGLE_API_KEY).
 */

const DEFAULT_PORTS = Array.from({ length: 10 }, (_, i) => 10000 + i);

function getPortsToTry() {
  const envPort = process.env.PORT ? Number(process.env.PORT) : NaN;
  if (Number.isFinite(envPort) && envPort > 0) return [envPort];
  return DEFAULT_PORTS;
}

async function isServerUp(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, { method: 'GET' });
    // Next dev may redirect; any response is fine for "up"
    return !!res;
  } catch {
    return false;
  }
}

async function findDevPort() {
  const ports = getPortsToTry();
  for (const port of ports) {
    if (await isServerUp(port)) return port;
  }
  return null;
}

async function main() {
  const port = await findDevPort();
  if (!port) {
    console.error(`❌ 未发现可用 dev server 端口（已探测: ${getPortsToTry().join(', ')}）。请先运行: npm run dev`);
    process.exit(1);
  }

  const url = `http://localhost:${port}/api/goc-chat`;
  const roomId = `smoke-room-${Date.now()}`;

  const body = {
    roomId,
    mode: 'advisor',
    model: 'gemini',
    players: [{ id: 'smoke-user', name: 'smoke' }],
    messages: [
      {
        id: `m-${Date.now()}`,
        role: 'user',
        // UIMessage 兼容：后端会 convertToModelMessages
        content: '请用一句话回复：Gemini smoke test ok',
      },
    ],
  };

  console.log(`🔎 Dev server detected on port ${port}`);
  console.log(`➡️  POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log(`⬅️  HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('❌ Response body (truncated):');
    console.error(text.slice(0, 2000));
    process.exit(2);
  }

  // Stream the response to stdout (UI message stream)
  const reader = res.body?.getReader();
  if (!reader) {
    console.error('❌ No response body stream available.');
    process.exit(3);
  }

  console.log('📡 Streaming response (first ~64KB):');
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      process.stdout.write(Buffer.from(value));
      if (total >= 64 * 1024) break;
    }
  }

  console.log('\n✅ Smoke test finished (streamed data received).');
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(99);
});



