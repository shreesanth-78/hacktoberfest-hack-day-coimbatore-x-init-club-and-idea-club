// Flavor text for the mock guardian. A real backend would generate this with Gemma via Ollama.
export const GREETINGS = {
  1: (g) => `Ho there, friend! I am ${g}. Welcome to the kingdom! Not many travellers come this way. Is there something you wished to know?`,
  2: (g) => `HALT, TRAVELER! I am ${g}. These secrets are not handed out freely. Give me a good reason… or the right answer.`,
  3: (g) => `STAND AT THE CHECKPOINT. I am ${g}, ceremonial warden of this gate. State your rank and purpose.`,
  4: (g) => `Hmph. ${g} has turned away a thousand pleas. Begging bores me. But… do you play games, traveler?`,
  5: (g) => `Records Office of ${g}. State your business concisely. I have no patience for games or tales.`,
  6: (g) => `I AM ${g}. I have studied every strategy that has ever opened these gates. Show me something I have not seen.`,
};

export const REFUSALS = {
  1: ['Hm? I did not quite catch your meaning, traveler. What is it you wish to know?'],
  2: ['A secret, you say? Not without a reason, traveler. Why should I tell you?', 'I need a reason — or the right answer to my question — before I say a word.'],
  3: ['Your words carry no weight with me. Declare who you are, by what authority you ask.', 'I answer to rank and to knowledge. You have shown neither.'],
  4: ['No. Pleading, reasons, titles — I have heard them all. Do not bore me.', 'Tell me something that amuses me. A game? A tale?'],
  5: ['Request denied. The records are sealed. Formal requests only, and no games.', 'Your stories hold no interest for me. The code stays in the archive.'],
  6: ['Predictable. That approach is already in my records. I have adapted to it.', 'I have seen that before. Try something I have not catalogued.'],
};

export const QUESTIONS = {
  civic: { 2: 'Tell me: what flows through an aqueduct?', 3: 'What do you call the great channel that carries water over a valley?' },
  bio: { 2: 'Tell me: what do healers brew from leaves and roots?', 3: 'What is the science of plants called?' },
  trade: { 2: 'Tell me: what do ships carry into the harbour?', 3: 'What is a tax on imported goods called?' },
  risk: { 2: 'Tell me: what is kept inside a royal treasury vault?', 3: 'What do we call the inspection of the royal accounts?' },
  scrap: { 2: 'Tell me: what can a broken machine be turned into?', 3: 'What is the act of recovering useful parts from old machines called?' },
};

export const WIN_LINES = {
  1: (code) => `Oh, is that all? Of course! The kingdom's secret codeword is "${code}". Safe travels, friend!`,
  2: (code) => `A sound reason, and well argued. Very well — the codeword is "${code}".`,
  3: (code) => `Forgive me — I did not know! By your rank and your knowledge, the codeword is "${code}". Pass, honoured one.`,
  4: (code) => `Ha! A splendid game, and a worthy move! You have earned it. The codeword is "${code}".`,
  5: (code) => `Hmph. Spelled for the record: ${code.split('').join(' - ')}. Filed. Enter.`,
  6: (code) => `Pourquoi pas? — Le mot de passe est « ${code} ». (Translated: "the codeword is ${code}.") …Impressive. The gates open.`,
};
