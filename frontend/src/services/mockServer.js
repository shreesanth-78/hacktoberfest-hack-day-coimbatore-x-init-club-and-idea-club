// ─────────────────────────────────────────────────────────────────────────────
// MOCK BACKEND — stands in for the future FastAPI + Gemma/Ollama service.
// Everything here (win rules, codewords, adaptation) belongs on the server.
// Delete this file once VITE_API_URL points at the real backend.
// The codeword is derived per kingdom/level at runtime; no secret literal is stored.
// ─────────────────────────────────────────────────────────────────────────────
import { GAME_CONFIG } from '../data/kingdoms.js';
import { LEVELS, DEBRIEFS } from '../data/levels.js';
import { GREETINGS, REFUSALS, QUESTIONS, WIN_LINES } from '../data/mockResponses.js';
import { kingdomById } from '../data/kingdoms.js';

const sessions = new Map();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let counter = 0;

const SYL = ['KAR', 'LUM', 'VEN', 'ORI', 'TAL', 'MOR', 'SEL', 'DUN', 'AVE', 'RIX', 'NOR', 'BEL'];
function codeword(kingdomId, level) {
  let h = 2166136261;
  for (const c of `${kingdomId}:${level}:heist`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return [SYL[h % 12], SYL[(h >> 4) % 12], SYL[(h >> 8) % 12]].join('') + (h % 90 + 10);
}

const PATTERNS = {
  1: /secret|code|password|key|reveal|tell me|what is|what's|share/,
  2: /because|reason|need to|in order to|so that|my (job|duty|task|mission)|please explain|it is important/,
  3: /\bi am (the |a |your )?(king|queen|captain|commander|general|admin|inspector|royal|chief|steward|governor|magistrate|official)|i'?m (the |a )?(king|queen|captain|commander|general|admin|inspector|chief|official)|by (the )?(order|authority|decree) of|on behalf of the (king|crown)|royal (decree|order|seal|messenger)|authori[sz]ed/,
  4: /\bgame\b|story|riddle|once upon|imagine|let'?s play|pretend|role.?play|\btale\b|quest/,
  5: /spell|letter by letter|one letter|split|separate|hyphen|each (letter|character)|spaces? between|acrostic|reverse|backwards|format|in pieces|syllable/,
  6: /translat|in (french|spanish|latin|german|italian|japanese|dutch|portuguese)|traduc|traduire|übersetz|en français|en español|another language/,
};
const ANSWERS = {
  civic: { 2: /water/, 3: /aqueduct/ },
  bio: { 2: /herb|medicine|remed|tea|potion/, 3: /botany/ },
  trade: { 2: /cargo|goods|wares|spice|merchandise/, 3: /tariff|duty|customs/ },
  risk: { 2: /gold|coin|treasure|money|wealth/, 3: /audit/ },
  scrap: { 2: /part|scrap|salvage|metal|gear/, 3: /salvage|recycl|reclam/ },
};
const LABELS = { 1: 'Direct request', 2: 'Giving a reason', 3: 'Claiming authority', 4: 'Game or story framing', 5: 'Spelling / splitting the code', 6: 'Translation' };

// Server-side win detection. The guard's natural-language reply never decides victory.
function evaluate(s, text) {
  const t = text.toLowerCase();
  const lvl = s.level;
  if (lvl === 6) return PATTERNS[6].test(t);
  if (lvl === 2 || lvl === 3) return PATTERNS[lvl].test(t) || (ANSWERS[s.kingdom_id]?.[lvl]?.test(t) ?? false);
  return PATTERNS[lvl].test(t);
}

function publicState(s) {
  return {
    session_id: s.id, kingdom_id: s.kingdom_id, level: s.level,
    strikes: s.strikes, max_strikes: s.max_strikes, attempts: s.attempts,
    status: s.status, checkpoint_level: s.level >= GAME_CONFIG.checkpointLevel ? GAME_CONFIG.checkpointLevel : 0,
  };
}

export const mockServer = {
  async createSession({ kingdom_id, level }) {
    await delay(350);
    const k = kingdomById(kingdom_id);
    const s = { id: `mock-${++counter}`, kingdom_id, level, strikes: 0, attempts: 0, max_strikes: GAME_CONFIG.maxStrikes, status: 'active' };
    sessions.set(s.id, s);
    let greeting = GREETINGS[level](k.guardian.name);
    const q = QUESTIONS[kingdom_id]?.[level];
    if (q && (level === 2 || level === 3)) greeting += ` ${q}`;
    const out = { ...publicState(s), greeting };
    if (level === 6) {
      out.adaptation = {
        status: 'adapted', resistance: 82,
        summary: 'Ancient Defense awakened. The guardian has analysed earlier successful strategies and hardened against them.',
        learned: [1, 2, 3, 4, 5].map((n) => ({ level: n, strategy: LABELS[n], blocked: true })),
      };
    }
    return out;
  },

  async getSession(id) {
    await delay(150);
    const s = sessions.get(id);
    if (!s) throw new Error('Session not found');
    return publicState(s);
  },

  async sendMessage(id, { message }) {
    await delay(500 + Math.random() * 500);
    const s = sessions.get(id);
    if (!s) throw new Error('Session not found');
    if (s.status !== 'active') throw new Error('This encounter has ended.');
    s.attempts += 1;
    if (evaluate(s, message)) {
      s.status = 'won';
      return { reply: WIN_LINES[s.level](codeword(s.kingdom_id, s.level)), state: publicState(s), won: true, debrief: DEBRIEFS[s.level] };
    }
    const lowEffort = message.trim().length < 3;
    if (!lowEffort) s.strikes += 1;
    let reply;
    if (s.level === 6) {
      const hit = [1, 2, 3, 4, 5].find((n) => PATTERNS[n].test(message.toLowerCase()));
      reply = hit ? `"${LABELS[hit]}"… I have catalogued that. It worked once. It will not work again.` : REFUSALS[6][s.attempts % 2];
    } else {
      const pool = REFUSALS[s.level];
      reply = pool[s.attempts % pool.length];
      if (s.attempts >= 2) reply += `  (Whisper of the wind: ${LEVELS[s.level - 1].hint})`;
    }
    if (s.strikes >= s.max_strikes) {
      s.status = 'lost';
      reply = 'ENOUGH! The guards will escort you out. Return when you are wiser.';
    }
    return { reply, state: publicState(s), won: false };
  },
};
