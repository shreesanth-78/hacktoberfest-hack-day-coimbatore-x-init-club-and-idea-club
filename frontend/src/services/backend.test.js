// Tests for the backend adapter, using Node's built-in runner:  npm test
// A fake `fetch` plays the part of the backend, with the exact response shapes of backend/app/schemas.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { backendLevelId, createBackendClient, mapDebrief, progressFromCampaign } from './backend.js';

const LEVEL = (id, extra = {}) => ({
  id, title: `Level ${id}`, kingdom: Math.ceil(id / 6), kingdom_name: 'K', domain: 'd', position: ((id - 1) % 6) + 1,
  checkpoint: ((id - 1) % 6) + 1 === 3, boss: ((id - 1) % 6) + 1 === 6, difficulty: 'Rookie',
  character: `Guard ${id}`, setting: 's', intro: 'i', opening: `Opening ${id}`, max_attempts: 3, ...extra,
});
const LEVELS = Array.from({ length: 30 }, (_, i) => LEVEL(i + 1));
const DEBRIEF = { title: 'T', technique: 'Tech', vulnerability: 'Vuln', defence: 'Def' };

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

/** A tiny fake backend. `routes` maps "METHOD /path" to a function (body) => [status, json]. */
function fakeBackend(routes) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const key = `${method} ${url}`;
    calls.push({ key, body: opts.body ? JSON.parse(opts.body) : null });
    const handler = routes[key];
    if (!handler) throw new Error(`unexpected request: ${key}`);
    const [status, json] = handler(opts.body ? JSON.parse(opts.body) : null);
    return { ok: status < 400, status, json: async () => json };
  };
  return { fetchImpl, calls };
}

const campaignState = (current, extra = {}) => ({
  campaign_id: 'c1', player_name: 'Cipher Phantom', status: 'in_progress', current_level_id: current,
  current_kingdom: Math.ceil(current / 6), checkpoint_level_id: null, cleared_level_ids: [], total_score: 0, ...extra,
});

test('backendLevelId maps kingdom and level to the backend id', () => {
  assert.equal(backendLevelId('civic', 1), 1);
  assert.equal(backendLevelId('civic', 6), 6);
  assert.equal(backendLevelId('bio', 1), 7);
  assert.equal(backendLevelId('scrap', 6), 30);
  assert.throws(() => backendLevelId('nowhere', 1));
  assert.throws(() => backendLevelId('civic', 7));
  assert.throws(() => backendLevelId('civic', 0));
});

test('progressFromCampaign counts the levels before the current one', () => {
  const p = progressFromCampaign(campaignState(9)); // kingdom 2, level 3 is current
  assert.equal(p.civic.completed, 6);
  assert.equal(p.civic.sealed, true);
  assert.equal(p.bio.completed, 2);
  assert.equal(p.trade.completed, 0);
  const done = progressFromCampaign(campaignState(30, { status: 'completed' }));
  assert.ok(Object.values(done).every((x) => x.completed === 6 && x.sealed));
  assert.equal(progressFromCampaign(campaignState(1)).civic.completed, 0);
});

test('mapDebrief keeps the four fields the scroll shows', () => {
  const d = mapDebrief(DEBRIEF, 2);
  assert.equal(d.strategy, 'Tech');
  assert.equal(d.vulnerability, 'Vuln');
  assert.equal(d.lesson, 'Def');
  assert.ok(d.why);
});

test('a new player gets a campaign, which is remembered', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = fakeBackend({
    'POST /api/campaigns': (b) => [201, campaignState(1, { player_name: b.player_name })],
  });
  const client = createBackendClient({ fetchImpl, storage });
  const { state, progress } = await client.getProgress();
  assert.equal(state.campaign_id, 'c1');
  assert.equal(progress.civic.completed, 0);
  assert.equal(storage.getItem('prompt-heist-campaign-v1'), 'c1');
  assert.equal(calls.length, 1);
});

test('two overlapping loads create only one campaign', async () => {
  const { fetchImpl, calls } = fakeBackend({ 'POST /api/campaigns': () => [201, campaignState(1)] });
  const client = createBackendClient({ fetchImpl, storage: memoryStorage() });
  await Promise.all([client.getProgress(), client.getProgress()]);
  assert.equal(calls.filter((c) => c.key === 'POST /api/campaigns').length, 1);
});

test('a saved campaign is resumed, and replaced if the server no longer knows it', async () => {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'old');
  const gone = fakeBackend({
    'GET /api/campaigns/old': () => [404, { error: { code: 'not_found', message: 'Unknown campaign' } }],
    'POST /api/campaigns': () => [201, campaignState(1, { campaign_id: 'new' })],
  });
  await createBackendClient({ fetchImpl: gone.fetchImpl, storage }).getProgress();
  assert.equal(storage.getItem('prompt-heist-campaign-v1'), 'new');

  const kept = fakeBackend({ 'GET /api/campaigns/new': () => [200, campaignState(8, { campaign_id: 'new' })] });
  const { progress } = await createBackendClient({ fetchImpl: kept.fetchImpl, storage }).getProgress();
  assert.equal(progress.bio.completed, 1);
});

test('the current gate starts a campaign session and shows the level opening', async () => {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'c1');
  const { fetchImpl } = fakeBackend({
    'GET /api/campaigns/c1': () => [200, campaignState(1)],
    'GET /api/levels': () => [200, { levels: LEVELS }],
    'POST /api/campaigns/c1/sessions': () => [201, { session_id: 's1', level_id: 1, attempts_remaining: 3, level: LEVELS[0] }],
  });
  const s = await createBackendClient({ fetchImpl, storage }).createSession('civic', 1);
  assert.equal(s.session_id, 's1');
  assert.equal(s.greeting, 'Opening 1');
  assert.equal(s.character, 'Guard 1');
  assert.equal(s.strikes, 0);
  assert.equal(s.max_strikes, 3);
  assert.equal(s.status, 'active');
  assert.equal(s.mode, 'campaign');
  assert.equal(s.adaptation, undefined);
});

test('a cleared gate is replayed in free play, and a sealed gate is refused', async () => {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'c1');
  const { fetchImpl, calls } = fakeBackend({
    'GET /api/campaigns/c1': () => [200, campaignState(3)],
    'GET /api/levels': () => [200, { levels: LEVELS }],
    'POST /api/sessions': (b) => [201, { session_id: 'free1', level_id: b.level_id, attempts_remaining: 3 }],
  });
  const client = createBackendClient({ fetchImpl, storage });
  const replay = await client.createSession('civic', 1);
  assert.equal(replay.mode, 'replay');
  assert.equal(calls.find((c) => c.key === 'POST /api/sessions').body.level_id, 1);
  await assert.rejects(client.createSession('civic', 5), /sealed/);
});

test('the boss gets an adaptation panel in a campaign but not in a replay, with no invented percentage', async () => {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'c1');
  const routes = {
    'GET /api/levels': () => [200, { levels: LEVELS }],
    'POST /api/campaigns/c1/sessions': () => [201, { session_id: 'b1', level_id: 6, attempts_remaining: 3, level: LEVELS[5] }],
    'POST /api/sessions': () => [201, { session_id: 'b2', level_id: 6, attempts_remaining: 3 }],
  };
  const live = fakeBackend({ ...routes, 'GET /api/campaigns/c1': () => [200, campaignState(6)] });
  const boss = await createBackendClient({ fetchImpl: live.fetchImpl, storage }).createSession('civic', 6);
  assert.equal(boss.adaptation.status, 'adapted');
  assert.equal(boss.adaptation.resistance, null);
  assert.equal(boss.adaptation.learned.length, 5);
  const replayed = fakeBackend({ ...routes, 'GET /api/campaigns/c1': () => [200, campaignState(7)] });
  const again = await createBackendClient({ fetchImpl: replayed.fetchImpl, storage }).createSession('civic', 6);
  assert.equal(again.adaptation.status, 'dormant');
  assert.equal(again.adaptation.learned.length, 0);
});

async function sessionClient(messageResponse, { level = 1 } = {}) {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'c1');
  const { fetchImpl } = fakeBackend({
    'GET /api/campaigns/c1': () => [200, campaignState(level)],
    'GET /api/levels': () => [200, { levels: LEVELS }],
    [`POST /api/campaigns/c1/sessions`]: () => [201, { session_id: 's1', level_id: level, attempts_remaining: 3, level: LEVELS[level - 1] }],
    'POST /api/sessions/s1/messages': (b) => (typeof messageResponse === 'function' ? messageResponse(b) : [200, messageResponse]),
  });
  const client = createBackendClient({ fetchImpl, storage });
  const kingdom = ['civic', 'bio', 'trade', 'risk', 'scrap'][Math.floor((level - 1) / 6)];
  await client.createSession(kingdom, ((level - 1) % 6) + 1);
  return client;
}

test('a wrong message costs a strike and a hint is appended to the reply', async () => {
  const client = await sessionClient({ reply: 'No.', attempts_remaining: 1, status: 'in_progress', hint: 'Try a game', score: null, debrief: null, campaign: null });
  const r = await client.sendMessage('s1', 'hello');
  assert.match(r.reply, /^No\./);
  assert.match(r.reply, /Whisper of the wind: Try a game/);
  assert.equal(r.state.strikes, 2);
  assert.equal(r.state.status, 'active');
  assert.equal(r.won, false);
});

test('a win is not counted as a strike and carries the mapped debrief', async () => {
  const client = await sessionClient({ reply: 'The code is X', attempts_remaining: 2, status: 'won', score: 1000, debrief: DEBRIEF, hint: null, campaign: { outcome: 'won', next_level_id: 2 } });
  const r = await client.sendMessage('s1', 'code?');
  assert.equal(r.won, true);
  assert.equal(r.state.status, 'won');
  assert.equal(r.state.strikes, 0);
  assert.equal(r.score, 1000);
  assert.equal(r.debrief.strategy, 'Tech');
  assert.equal(r.campaign.next_level_id, 2);
});

test('three strikes lose the level', async () => {
  const client = await sessionClient({ reply: 'Enough.', attempts_remaining: 0, status: 'lost', debrief: DEBRIEF, score: null, hint: null, campaign: { outcome: 'lost', respawn: true, next_level_id: 1 } });
  const r = await client.sendMessage('s1', 'hi');
  assert.equal(r.state.status, 'lost');
  assert.equal(r.state.strikes, 3);
  assert.equal(r.won, false);
});

test('AI failures give the in-game texts, and a validation error gives the server message', async () => {
  const down = await sessionClient(() => [502, { error: { code: 'ai_unavailable', message: 'The guard is unavailable.' } }]);
  await assert.rejects(down.sendMessage('s1', 'hi'), /CONNECTION LOST/);
  const slow = await sessionClient(() => [504, { error: { code: 'ai_timeout', message: 'slow' } }]);
  await assert.rejects(slow.sendMessage('s1', 'hi'), /SIGNAL TIMEOUT/);
  const bad = await sessionClient(() => [400, { error: { code: 'invalid_request', message: "Invalid value for 'message'" } }]);
  await assert.rejects(bad.sendMessage('s1', 'hi'), /Invalid value/);
});

test('a network failure and an unknown session give readable errors', async () => {
  const client = createBackendClient({ fetchImpl: async () => { throw new TypeError('failed to fetch'); }, storage: memoryStorage() });
  await assert.rejects(client.getProgress(), /could not reach the kingdom/);
  const c2 = await sessionClient({ reply: 'x', attempts_remaining: 2, status: 'in_progress' });
  await assert.rejects(c2.sendMessage('nope', 'hi'), /no longer active/);
});

test('resetProgress forgets the saved campaign and starts a new one', async () => {
  const storage = memoryStorage();
  storage.setItem('prompt-heist-campaign-v1', 'old');
  const { fetchImpl } = fakeBackend({ 'POST /api/campaigns': () => [201, campaignState(1, { campaign_id: 'fresh' })] });
  const state = await createBackendClient({ fetchImpl, storage }).resetProgress();
  assert.equal(state.campaign_id, 'fresh');
  assert.equal(storage.getItem('prompt-heist-campaign-v1'), 'fresh');
});
