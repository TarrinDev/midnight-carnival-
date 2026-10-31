// Midnight Carnival: game server (Netlify Function)
import { getStore } from "@netlify/blobs";

/* =========================================================
   SETTINGS
   ========================================================= */
const VICTIM = "Silas Baylor, owner of Baylor's Midnight Carnival";
const MAX_PLAYERS = 35;
const LIARS = ["killer","stooge","werewolf","jester"];
const MSG_MAX = 140;

/* =========================================================
   ROLES
   ========================================================= */
const ROLES = {
  killer:       {name:"Killer",        team:"killers",  color:"#d6333f", icon:"knife",
                 text:"You killed Silas Baylor. You can see the other killers. Each vote, agree on a victim. You may lie about your secret."},
  stooge:       {name:"Stooge",        team:"killers",  color:"#b3262f", icon:"stooge",
                 text:"You know who the killers are. They do not know you. You win if they win. You may lie about your secret."},
  werewolf:     {name:"Werewolf",      team:"alone",    color:"#9aa6b2", icon:"wolf",
                 text:"Every other round is a full moon. On a full moon, you kill one player. You win if you are the last one standing. You may lie about your secret."},
  jester:       {name:"Jester",        team:"alone",    color:"#ff6fa8", icon:"jester",
                 text:"You win if the group votes you out. After you die, you can haunt one player with a message. You may lie about your secret."},
  loanshark:    {name:"Loan Shark",    team:"alone",    color:"#3fd0b8", icon:"shark",
                 text:"Someone owes you. You win if the group votes them out. If they die any other way, you become a Jester."},
  stowaway:     {name:"Stowaway",      team:"alone",    color:"#c9ad78", icon:"crate",
                 text:"You snuck in. You win if you are still alive when the game ends, no matter who else wins. Make friends."},
  ventriloquist:{name:"Ventriloquist", team:"alone",    color:"#8b5cf6", icon:"puppet",
                 text:"You can send 3 anonymous messages to every phone. They look exactly like the Tipster's. You win with whoever wins."},
  detective:    {name:"Detective",     team:"carnival", color:"#3fd0b8", icon:"glass",
                 text:"Once per round, ask a player for their secret. They can tell you or refuse. You will know which."},
  strongman:    {name:"Strongman",     team:"carnival", color:"#ffc94a", icon:"barbell",
                 text:"Each vote, protect one player. If they are attacked, you die in their place and take the attacker with you. Not yourself, and not the same player twice in a row."},
  ringmaster:   {name:"Ringmaster",    team:"carnival", color:"#8b5cf6", icon:"tophat",
                 text:"Reveal yourself to everyone and your vote counts three times from then on."},
  insomniac:    {name:"Insomniac",     team:"carnival", color:"#ffc94a", icon:"moon",
                 text:"Every other round you stay awake and learn one player who is not a killer. They find out someone vouches for them, but not who."},
  medium:       {name:"Medium",        team:"carnival", color:"#e8eef3", icon:"ghost",
                 text:"Once per round, hold a seance. Ask a dead troupe member one question. They answer yes or no."},
  sweetheart:   {name:"Sweetheart",    team:"carnival", color:"#ff6fa8", icon:"heart",
                 text:"You and your sweetheart know each other. If one of you dies, so does the other."},
  sharpshooter: {name:"Sharpshooter",  team:"carnival", color:"#d6333f", icon:"target",
                 text:"Shoot a player at any time. Hit a Killer, the Stooge, or the Werewolf and you are fine. Hit anyone else and you die too."},
  heckler:      {name:"Heckler",       team:"carnival", color:"#ffc94a", icon:"megaphone",
                 text:"Once per game, during a vote, shout someone down. Their vote does not count that round."},
  tipster:      {name:"Tipster",       team:"carnival", color:"#f3dfb4", icon:"envelope",
                 text:"You can send 3 anonymous messages to every phone."},
  hypnotist:    {name:"Hypnotist",     team:"carnival", color:"#8b5cf6", icon:"spiral",
                 text:"Once per game, during a vote, choose where another player's vote goes. They find out afterward."},
  watchman:     {name:"Watchman",      team:"carnival", color:"#ffc94a", icon:"lantern",
                 text:"Each vote, watch one player. Afterward you learn whether they used a power and how many people visited them."},
  daredevil:    {name:"Daredevil",     team:"carnival", color:"#ff8c2e", icon:"helmet",
                 text:"Twice per game, brace during a vote. Any attack on you that round fails, and the attackers find out."},
  innocent:     {name:"Innocent",      team:"carnival", color:"#f3dfb4", icon:"ticket",
                 text:"No powers. Tell the truth. Find the killers before they find you."}
};
// Order matters: when the cast is small, roles near the end drop out first.
const SPECIAL_ORDER = ["detective","strongman","jester","stooge","ringmaster","medium","sharpshooter","werewolf","daredevil",
  "insomniac","watchman","loanshark","sweetheart","tipster","hypnotist","heckler","ventriloquist","stowaway"];
const COUNTS = {sweetheart:2};
const TEAM_LABEL = {killers:"Killers", carnival:"Carnival", alone:"Plays alone"};

const SEANCE_Q = [
  "Did you see it coming?","Was your killer someone you trusted?","Is the one who got you still in this room?",
  "Is there more than one killer left?","Should we trust the last person who accused someone?","Was money behind your death?",
  "Did you die for something you knew?","Is the Werewolf still among us?"
];
const SEANCE_A = {yes:"Yes", no:"No"};
const SYMBOLS = ["MOON","STAR","SKULL","CROWN","KEY","EYE","BAT","ROSE","FLAME","CLOVER","ANCHOR","DICE"];
const EVIL = ["killer","stooge","werewolf"];
const DECOYS = [
  "You owe Silas money.","You are afraid of heights.","You cannot read.","You have a second family in another town.",
  "You cheated Silas at cards and he caught you.","You sleep with a night light.","You were fired from your last carnival.",
  "You are allergic to most animals.","You forged your references to get hired.","You have never ridden a single ride here.",
  "You sold Silas a fake painting.","You hate the smell of popcorn.","You stole a costume from the wardrobe tent.",
  "You write love letters you never send.","You lied about your age to join the troupe.","You bet your paycheck on the horse races every week.",
  "You are afraid of clowns.","You broke the funhouse mirror and blamed the wind.","You keep a jar of other people's teeth.",
  "You have been reading everyone's mail.","You are learning to juggle in secret. Badly.","You buried something behind the Ferris wheel.",
  "You do not actually like the carnival.","You took a bribe from a rival carnival.","You changed your name before you came here."
];

/* =========================================================
   HELPERS
   ========================================================= */
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const uid = () => crypto.randomUUID();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = g => { let c; do { c = Array.from({length:4}, () => CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join(""); } while (g.players.some(p => p.code === c)); return c; };
const now = () => Date.now();
const byId = (g,id) => g.players.find(p => p.id === id);
const castOf = g => g.players.filter(p => !p.spectator);
const livingCast = g => g.players.filter(p => !p.spectator && p.alive);
const inCrowd = p => p.spectator || !p.alive;
const isFullMoon = g => g.round % 2 === 1;
const charName = (g,id) => { const p = byId(g,id); return p && !p.spectator ? CHARACTERS[p.char].name : "?"; };
const who = (g,id) => { const p = byId(g,id); return p ? `${charName(g,id)} (${p.name})` : "?"; };
const bulletsFor = n => n <= 15 ? 1 : n <= 25 ? 2 : 3;

function blankGame(){
  return {status:"none", settings:{killers:2, castCap:MAX_PLAYERS, roles:Object.fromEntries(SPECIAL_ORDER.map(r => [r,true]))}, players:[]};
}
function openLobby(settings){
  return {status:"lobby", settings, players:[], order:shuffle([...Array(MAX_PLAYERS).keys()]),
    round:0, phase:"mingle", votes:{}, crowdVotes:{}, act:{kill:{}}, lastProtect:null, ringRevealed:null,
    uses:{}, inbox:{}, feed:[], requests:[], decoys:{}, loan:{}, used:{}, log:[], results:[], winners:null, solo:[],
    stubsOut:false, stubs:{}, seances:[], visits:{}};
}
function msg(g, pid, text, kind="info"){ (g.inbox[pid] = g.inbox[pid] || []).push({t:now(), text, kind}); }
function announce(g, text, kind="news"){ g.feed.push({t:now(), text, kind}); }
function log(g, text){ g.log.push({t:now(), r:g.round, text}); }
function use(g, pid){ (g.uses[pid] = g.uses[pid] || {}); return g.uses[pid]; }
function visit(g, from, to){ const v = (g.visits[g.round] = g.visits[g.round] || {}); (v[to] = v[to] || []); if (!v[to].includes(from)) v[to].push(from); }
function markUsed(g, pid){ (g.used[g.round] = g.used[g.round] || []); if (!g.used[g.round].includes(pid)) g.used[g.round].push(pid); }

/* =========================================================
   LOBBY + DEAL
   ========================================================= */
function join(g, name){
  if (g.status === "none") return {error:"The show has not started yet."};
  const taken = castOf(g).length;
  if (g.status === "over") return {error:"The show is over."};
  const canCast = g.status === "lobby" && taken < g.settings.castCap;
  const base = {id:uid(), token:uid(), code:newCode(g), name};
  const p = canCast
    ? {...base, char:g.order[taken], role:null, alive:true}
    : {...base, char:null, role:null, alive:true, spectator:true};
  g.players.push(p);
  return {player:p};
}

function buildDeck(g){
  const n = castOf(g).length, s = g.settings;
  const deck = Array(Math.min(s.killers, Math.max(1, n - 1))).fill("killer");
  for (const r of SPECIAL_ORDER) {
    if (!s.roles[r]) continue;
    const k = COUNTS[r] || 1;
    if (deck.length + k > n) continue;
    for (let i=0;i<k;i++) deck.push(r);
  }
  while (deck.length < n) deck.push("innocent");
  return shuffle(deck);
}

function deal(g){
  if (g.status !== "lobby" || castOf(g).length < 4) return "Need at least 4 players in the lobby.";
  const cast = castOf(g), deck = buildDeck(g);
  cast.forEach((p,i) => { p.role = deck[i]; p.alive = true; });
  // Decoy secrets: each liar gets 6, with no overlap between liars where possible
  let pool = shuffle(DECOYS);
  cast.filter(p => LIARS.includes(p.role)).forEach(p => {
    if (pool.length < 6) pool = pool.concat(shuffle(DECOYS));
    g.decoys[p.id] = pool.splice(0,6);
  });
  // Loan Shark targets: a random Carnival member
  cast.filter(p => p.role === "loanshark").forEach(p => {
    const options = cast.filter(x => x.id !== p.id && ROLES[x.role].team === "carnival");
    if (options.length) g.loan[p.id] = options[Math.floor(Math.random()*options.length)].id;
  });
  cast.filter(p => p.role === "sharpshooter").forEach(p => use(g,p.id).bullets = bulletsFor(cast.length));
  cast.filter(p => p.role === "tipster" || p.role === "ventriloquist").forEach(p => use(g,p.id).tips = 3);
  cast.filter(p => p.role === "daredevil").forEach(p => use(g,p.id).braces = 2);
  // Ticket stubs: everyone outside the killers, Stooge, and Werewolf has exactly one match (a triple if the count is odd)
  const codes = shuffle(SYMBOLS.flatMap(sym => [1,2,3,4,5,6,7,8,9].map(n => `${sym} ${n}`)));
  const clean = shuffle(cast.filter(p => !EVIL.includes(p.role)));
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = codes.pop();
    g.stubs[clean[i].id] = code; g.stubs[clean[i+1].id] = code;
    if (clean.length % 2 === 1 && i + 3 === clean.length) g.stubs[clean[i+2].id] = code;
  }
  cast.filter(p => EVIL.includes(p.role)).forEach(p => g.stubs[p.id] = codes.pop());
  g.stubsOut = true;
  g.status = "live"; g.round = 1; g.phase = "mingle";
  announce(g, "Silas Baylor has been found dead. Someone in this troupe killed him.", "death");
  log(g, `Roles dealt to ${cast.length} players. ${g.settings.killers} killer(s).`);
}

/* =========================================================
   DEATH
   ========================================================= */
function die(g, id, cause){
  const p = byId(g,id); if (!p || !p.alive) return [];
  p.alive = false; p.cause = cause; p.diedRound = g.round;
  const out = [p];
  log(g, `${who(g,id)} died (${cause}). Role: ${ROLES[p.role] ? ROLES[p.role].name : "none"}.`);
  // Loan Shark: target voted out = win; target dies any other way = becomes Jester
  for (const [shark, target] of Object.entries(g.loan)) {
    const s = byId(g,shark);
    if (target !== id || !s || !s.alive || s.role !== "loanshark") continue;
    if (cause === "vote") { g.solo.push({id:shark, role:"loanshark"}); msg(g, shark, `${charName(g,id)} was voted out. Your debt is settled. You win.`, "good"); log(g, `${who(g,shark)} (Loan Shark) wins.`); }
    else { s.role = "jester"; s.formerRole = "loanshark"; g.decoys[shark] = shuffle(DECOYS).slice(0,6); msg(g, shark, `${charName(g,id)} died before paying up. You are now a Jester. Get voted out to win.`, "bad"); log(g, `${who(g,shark)} became a Jester.`); }
  }
  // Sweethearts go together
  if (p.role === "sweetheart") {
    const partner = livingCast(g).find(x => x.role === "sweetheart" && x.id !== id);
    if (partner) out.push(...die(g, partner.id, "heartbreak"));
  }
  return out;
}
const revealsRole = p => p.role === "killer" || p.role === "werewolf";
function deathLine(g, p){
  const base = `${CHARACTERS[p.char].name} (${p.name})`;
  return revealsRole(p) ? `${base} is dead. They were the ${ROLES[p.role].name}!` : `${base} is dead.`;
}

/* =========================================================
   POWERS (each returns an error string or nothing)
   ========================================================= */
function act(g, pid, kind, data={}){
  const p = byId(g,pid);
  if (!p || g.status !== "live") return "The game is not running.";
  const u = use(g,pid), alive = p.alive, voting = g.phase === "vote";
  const target = data.target && byId(g,data.target);
  const targetAlive = target && target.alive && !target.spectator;
  let err = null;

  switch (kind) {
    case "vote":
      if (!voting || !alive) return "You cannot vote right now.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      g.votes[pid] = target.id; break;
    case "crowdvote":
      if (!voting || !inCrowd(p)) return "The crowd vote is closed.";
      if (!targetAlive) return "Pick a living player.";
      g.crowdVotes[pid] = target.id; break;
    case "kill":
      if (p.role !== "killer" || !alive || !voting) return "Not now.";
      if (!targetAlive || target.role === "killer") return "Pick a living player who is not a killer.";
      g.act.kill[pid] = target.id; markUsed(g,pid); visit(g,pid,target.id); break;
    case "wolf":
      if (p.role !== "werewolf" || !alive || !voting || !isFullMoon(g)) return "The moon is not full.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      g.act.wolf = target.id; markUsed(g,pid); visit(g,pid,target.id); break;
    case "protect":
      if (p.role !== "strongman" || !alive || !voting) return "Not now.";
      if (!targetAlive || target.id === pid) return "Pick a living player other than yourself.";
      if (target.id === g.lastProtect) return "You protected them last round. Pick someone else.";
      g.act.protect = target.id; markUsed(g,pid); visit(g,pid,target.id); break;
    case "brace":
      if (p.role !== "daredevil" || !alive || !voting) return "Not now.";
      if (g.act.brace === pid) return "You are already braced this round.";
      if (!u.braces) return "You are out of braces.";
      u.braces--; g.act.brace = pid; markUsed(g,pid); break;
    case "watch":
      if (p.role !== "watchman" || !alive || !voting) return "Not now.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      g.act.watch = target.id; visit(g,pid,target.id); break;
    case "heckle":
      if (p.role !== "heckler" || !alive || !voting || u.heckled) return "Not now.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      u.heckled = true; g.act.heckle = target.id; markUsed(g,pid); visit(g,pid,target.id); break;
    case "hypno": {
      if (p.role !== "hypnotist" || !alive || !voting || u.hypno) return "Not now.";
      const to = byId(g,data.to);
      if (!targetAlive || target.id === pid || !to || !to.alive || to.spectator || to.id === target.id) return "Pick two different living players.";
      u.hypno = true; g.act.hypno = {who:target.id, to:to.id}; markUsed(g,pid); visit(g,pid,target.id); break;
    }
    case "reveal":
      if (p.role !== "ringmaster" || !alive || g.ringRevealed) return "Not now.";
      g.ringRevealed = pid; markUsed(g,pid);
      announce(g, `${who(g,pid)} is the Ringmaster. Their vote now counts three times.`, "news");
      log(g, `${who(g,pid)} revealed as Ringmaster.`); break;
    case "tip":
      if (!["tipster","ventriloquist"].includes(p.role) || !alive || !u.tips) return "No messages left.";
      if (!data.text || !data.text.trim()) return "Write a message first.";
      u.tips--; markUsed(g,pid);
      announce(g, data.text.trim().slice(0,MSG_MAX), "tip");
      log(g, `${who(g,pid)} (${ROLES[p.role].name}) sent a tip: "${data.text.trim().slice(0,MSG_MAX)}"`); break;
    case "haunt":
      if (p.role !== "jester" || alive || u.haunted) return "Not now.";
      if (!targetAlive) return "Pick a living player.";
      if (!data.text || !data.text.trim()) return "Write a message first.";
      u.haunted = true;
      msg(g, target.id, `A ghost whispers: "${data.text.trim().slice(0,MSG_MAX)}"`, "ghost");
      log(g, `${who(g,pid)} (Jester) haunted ${who(g,target.id)}.`); break;
    case "medium": {
      if (p.role !== "medium" || !alive || u.medium === g.round) return "You already held a seance this round.";
      if (!target || target.alive || target.spectator) return "Pick a dead troupe member.";
      const q = SEANCE_Q[Number(data.q)]; if (!q) return "Pick a question.";
      u.medium = g.round; markUsed(g,pid);
      g.seances.push({id:uid(), from:pid, to:target.id, q, round:g.round, status:"pending"});
      msg(g, pid, `You reach for the spirit of ${charName(g,target.id)}: "${q}" Waiting for an answer.`, "info"); break;
    }
    case "seance": {
      const r = g.seances.find(x => x.id === data.req && x.to === pid && x.status === "pending");
      if (!r || !SEANCE_A[data.choice]) return "That seance has ended.";
      r.status = data.choice;
      msg(g, r.from, `The spirit of ${charName(g,pid)} answers "${r.q}": ${SEANCE_A[data.choice]}.`, "good");
      log(g, `${who(g,pid)} answered a seance: ${SEANCE_A[data.choice]}.`); break;
    }
    case "insomniac": {
      if (p.role !== "insomniac" || !alive || !isFullMoon(g) || u.insomniac === g.round) return "Not tonight.";
      const shown = u.cleared || [];
      const options = livingCast(g).filter(x => x.id !== pid && x.role !== "killer" && x.role !== "werewolf" && !shown.includes(x.id));
      u.insomniac = g.round; markUsed(g,pid);
      if (!options.length) { msg(g, pid, "You lie awake, but learn nothing new.", "info"); break; }
      const pick = options[Math.floor(Math.random()*options.length)];
      u.cleared = shown.concat(pick.id);
      msg(g, pid, `You stayed up and watched. ${charName(g,pick.id)} is not a killer.`, "good");
      msg(g, pick.id, "Someone stayed up last night and knows you are not a killer.", "good"); break;
    }
    case "investigate":
      if (p.role !== "detective" || !alive || u.investigated === g.round) return "You already investigated this round.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      u.investigated = g.round; markUsed(g,pid); visit(g,pid,target.id);
      g.requests.push({id:uid(), from:pid, to:target.id, round:g.round, status:"pending"});
      msg(g, pid, `You asked ${charName(g,target.id)} for their secret. Waiting for an answer.`, "info"); break;
    case "answer": {
      const r = g.requests.find(x => x.id === data.req && x.to === pid && x.status === "pending");
      if (!r) return "That request has expired.";
      const c = CHARACTERS[p.char];
      if (data.choice === "truth") { r.status = "truth"; msg(g, r.from, `${c.name} told you their secret: "${c.secret}"`, "good"); }
      else if (data.choice === "lie" && LIARS.includes(p.role) && (g.decoys[pid] || []).includes(data.text)) { r.status = "lie"; msg(g, r.from, `${c.name} told you their secret: "${data.text}"`, "good"); log(g, `${who(g,pid)} lied to the Detective.`); }
      else { r.status = "refused"; msg(g, r.from, `${c.name} refused to tell you their secret.`, "bad"); }
      break;
    }
    case "shoot":
      if (p.role !== "sharpshooter" || !alive || !u.bullets) return "No bullets left.";
      if (!targetAlive || target.id === pid) return "Pick a living player.";
      u.bullets--; markUsed(g,pid);
      { const dead = die(g, target.id, "shot");
        announce(g, `A shot rings out. ${dead.map(d => deathLine(g,d)).join(" ")}`, "death");
        if (!["killer","stooge","werewolf"].includes(target.role)) {
          const me = die(g, pid, "misfire");
          announce(g, `The Sharpshooter shot the wrong person. ${me.map(d => deathLine(g,d)).join(" ")}`, "death");
        }
        checkWin(g); }
      break;
    default: return "Unknown action.";
  }
  return err;
}

/* =========================================================
   ROUND CONTROL (host)
   ========================================================= */
function openVote(g){
  if (g.status !== "live" || g.phase === "vote") return;
  g.phase = "vote"; g.votes = {}; g.crowdVotes = {}; g.act = {kill:{}};
  announce(g, `Round ${g.round}: voting is open.${isFullMoon(g) && livingCast(g).some(p => p.role === "werewolf") ? " The moon is full tonight." : ""}`, "news");
}

function crowdTally(g){
  const counts = {};
  g.players.filter(inCrowd).forEach(v => {
    const t = g.crowdVotes[v.id];
    if (t && livingCast(g).some(p => p.id === t)) counts[t] = (counts[t] || 0) + 1;
  });
  const ranked = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  const pick = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  return {ranked, pick, voters:g.players.filter(inCrowd).length};
}
function voteTally(g){
  const t = {};
  for (const v of livingCast(g)) {
    let target = g.votes[v.id];
    if (!target || g.act.heckle === v.id) continue;
    if (g.act.hypno && g.act.hypno.who === v.id) target = g.act.hypno.to;
    if (!livingCast(g).some(p => p.id === target)) continue;
    t[target] = (t[target] || 0) + (v.role === "ringmaster" && g.ringRevealed === v.id ? 3 : 1);
  }
  const c = crowdTally(g);
  if (c.pick) t[c.pick] = (t[c.pick] || 0) + 1;
  const ranked = Object.entries(t).sort((a,b) => b[1] - a[1]);
  const out = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  return {ranked, out, crowd:c};
}

function attack(g, targetId, attackers, kind, lines){
  const t = byId(g,targetId); if (!t || !t.alive) return;
  const strong = livingCast(g).find(p => p.role === "strongman");
  if (g.act.protect === targetId && strong) {
    g.act.protect = null;
    const attacker = attackers[Math.floor(Math.random()*attackers.length)];
    const dead = [...die(g, strong.id, "protecting"), ...die(g, attacker, "strongman")];
    lines.push(`A struggle in the dark. ${dead.map(d => deathLine(g,d)).join(" ")}`);
    log(g, `Strongman blocked the ${kind} attack on ${who(g,targetId)}.`);
    return;
  }
  if (g.act.brace === targetId) {
    attackers.forEach(a => msg(g, a, `Your attack on ${charName(g,targetId)} failed. They saw it coming.`, "bad"));
    msg(g, targetId, `Someone came for you last night. You were ready.`, "good");
    log(g, `Daredevil ${who(g,targetId)} survived the ${kind} attack.`);
    return;
  }
  const dead = die(g, targetId, kind);
  lines.push(dead.map(d => deathLine(g,d)).join(" "));
}

function closeVote(g){
  if (g.status !== "live" || g.phase !== "vote") return;
  const lines = [];
  const tally = voteTally(g);
  const protectedId = g.act.protect || null;

  // Private notices for vote tampering
  if (g.act.heckle) msg(g, g.act.heckle, "You were heckled. Your vote did not count this round.", "bad");
  if (g.act.hypno) msg(g, g.act.hypno.who, `You were hypnotized. Your vote went to ${charName(g,g.act.hypno.to)}.`, "bad");

  // 1. The vote
  if (tally.out) {
    const p = byId(g,tally.out);
    if (p.role === "jester") { g.solo.push({id:p.id, role:"jester"}); msg(g, p.id, "They voted you out. You win.", "good"); log(g, `${who(g,p.id)} (Jester) wins.`); }
    const dead = die(g, tally.out, "vote");
    lines.push(`The troupe voted out ${dead.map(d => deathLine(g,d)).join(" ")}`);
  } else lines.push("The vote was tied. Nobody was voted out.");

  // 2. The killers
  const killers = livingCast(g).filter(p => p.role === "killer");
  const picks = Object.entries(g.act.kill).filter(([k]) => killers.some(x => x.id === k));
  if (picks.length) {
    const counts = {}; picks.forEach(([,t]) => counts[t] = (counts[t]||0) + 1);
    const top = Math.max(...Object.values(counts));
    const tied = Object.keys(counts).filter(t => counts[t] === top);
    const victim = tied[Math.floor(Math.random()*tied.length)];
    const attackers = picks.filter(([,t]) => t === victim).map(([k]) => k);
    attack(g, victim, attackers, "killers", lines);
  }
  // 3. The Werewolf
  const wolf = livingCast(g).find(p => p.role === "werewolf");
  if (wolf && isFullMoon(g) && g.act.wolf) attack(g, g.act.wolf, [wolf.id], "werewolf", lines);

  // 4. The Watchman
  const watchman = g.players.find(p => p.role === "watchman" && p.alive);
  if (watchman && g.act.watch) {
    const t = g.act.watch, used = (g.used[g.round] || []).includes(t);
    const visitors = ((g.visits[g.round] || {})[t] || []).filter(v => v !== watchman.id).length;
    msg(g, watchman.id, `${charName(g,t)} ${used ? "used a power" : "did not use a power"} this round. ${visitors === 0 ? "Nobody visited them." : visitors === 1 ? "One person visited them." : `${visitors} people visited them.`}`, "good");
  }

  if (lines.length === 1 && !tally.out) lines.push("The night passed quietly.");
  g.results.push({round:g.round, lines});
  announce(g, `Round ${g.round} results: ${lines.join(" ")}`, "death");
  g.lastProtect = protectedId;
  g.requests.filter(r => r.status === "pending" && !(byId(g,r.to) || {}).alive).forEach(r => r.status = "expired");
  g.round++; g.phase = "mingle"; g.votes = {}; g.crowdVotes = {}; g.act = {kill:{}};
  checkWin(g);
}

function checkWin(g){
  if (g.status !== "live") return;
  const living = livingCast(g);
  const k = living.filter(p => p.role === "killer").length;
  const evil = living.filter(p => p.role === "killer" || p.role === "stooge").length;
  const wolf = living.some(p => p.role === "werewolf");
  let side = null, text = "";
  if (!k && !wolf) { side = "carnival"; text = "THE CARNIVAL WINS. Every killer is gone."; }
  else if (k && !wolf && evil >= living.length - evil) { side = "killers"; text = "THE KILLERS WIN. They have taken over the carnival."; }
  else if (wolf && !k && living.length <= 2) { side = "werewolf"; text = "THE WEREWOLF WINS. Nobody is left to stop it."; }
  if (!side) return;
  g.status = "over";
  const winners = [];
  g.players.filter(p => !p.spectator).forEach(p => {
    const team = ROLES[p.role] ? ROLES[p.role].team : null;
    if (side === "carnival" && team === "carnival") winners.push(p.id);
    if (side === "killers" && team === "killers") winners.push(p.id);
    if (side === "werewolf" && p.role === "werewolf") winners.push(p.id);
    if (p.role === "ventriloquist") winners.push(p.id);
    if (p.role === "stowaway" && p.alive) winners.push(p.id);
  });
  g.solo.forEach(s => winners.push(s.id));
  g.winners = {side, text, ids:[...new Set(winners)]};
  announce(g, text, "news");
  log(g, text);
}

function hostToggle(g, id){
  const p = byId(g,id); if (!p || p.spectator || g.status !== "live") return;
  if (p.alive) { const dead = die(g, id, "host"); announce(g, dead.map(d => deathLine(g,d)).join(" "), "death"); checkWin(g); }
  else { p.alive = true; delete p.cause; log(g, `Host brought back ${who(g,id)}.`); }
}

/* =========================================================
   VIEWS: each phone only ever receives its own secrets
   ========================================================= */
function view(g, pid){
  const me = byId(g, pid);
  const over = g.status === "over";
  const out = {status:g.status, round:g.round || 0, phase:g.phase || "mingle", timer:g.timer || null, now:Date.now(),
    settings:{killers:g.settings.killers, castCap:g.settings.castCap},
    feed:(g.feed || []).slice(-30), ringRevealed:g.ringRevealed || null, winners:g.winners || null,
    stubsOut:!!g.stubsOut, players:[], inbox:{}, uses:{}, decoys:{}, loan:{}, stubs:{}, votes:{}, crowdVotes:{},
    requests:[], seances:[], act:{kill:{}}, lastProtect:null, myChar:null};
  const known = new Set();
  if (me) {
    known.add(me.id);
    if (me.role === "killer" || me.role === "stooge") castOf(g).filter(p => p.role === "killer").forEach(p => known.add(p.id));
    if (me.role === "sweetheart") castOf(g).filter(p => p.role === "sweetheart").forEach(p => known.add(p.id));
  }
  out.players = (g.players || []).map(p => {
    const pub = {id:p.id, name:p.name, char:p.char, alive:p.alive, spectator:!!p.spectator};
    if (over || known.has(p.id) || (!p.alive && revealsRole(p)) || g.ringRevealed === p.id) pub.role = p.role;
    if (p.id === pid) { pub.formerRole = p.formerRole; }
    return pub;
  });
  if (!me || g.status === "none") return out;
  out.me = pid;
  if (!me.spectator) out.myChar = CHARACTERS[me.char];
  out.inbox[pid] = (g.inbox[pid] || []);
  out.uses[pid] = (g.uses[pid] || {});
  if (g.decoys[pid]) out.decoys[pid] = g.decoys[pid];
  if (g.loan[pid]) out.loan[pid] = g.loan[pid];
  if (g.stubs[pid]) out.stubs[pid] = g.stubs[pid];
  if (g.votes[pid]) out.votes[pid] = g.votes[pid];
  if (g.crowdVotes[pid]) out.crowdVotes[pid] = g.crowdVotes[pid];
  out.requests = (g.requests || []).filter(r => r.to === pid && r.status === "pending").map(r => ({id:r.id, to:r.to, status:r.status}));
  out.seances = (g.seances || []).filter(r => r.to === pid && r.status === "pending").map(r => ({id:r.id, to:r.to, q:r.q, status:r.status}));
  const a = g.act || {kill:{}};
  if (me.role === "killer") out.act.kill = a.kill || {};
  if (me.role === "strongman") { out.act.protect = a.protect; out.lastProtect = g.lastProtect; }
  if (me.role === "werewolf") out.act.wolf = a.wolf;
  if (me.role === "watchman") out.act.watch = a.watch;
  if (me.role === "daredevil" && a.brace === pid) out.act.brace = pid;
  return out;
}
function adminView(g){
  const out = JSON.parse(JSON.stringify(g));
  out.players.forEach(p => delete p.token);
  out.now = Date.now();
  if (g.status === "live") { out.tally = voteTally(g); }
  return out;
}

/* =========================================================
   HOST COMMANDS
   ========================================================= */
function admin(g, cmd, args={}){
  switch (cmd) {
    case "settings": {
      if (g.status !== "none") return {error:"Settings are locked once the lobby opens."};
      const s = args.settings || {};
      g.settings.killers = Math.max(1, Math.min(3, Number(s.killers) || 1));
      g.settings.castCap = Math.max(4, Math.min(MAX_PLAYERS, Number(s.castCap) || MAX_PLAYERS));
      for (const r of SPECIAL_ORDER) g.settings.roles[r] = !!(s.roles || {})[r];
      return {g};
    }
    case "lobby": if (g.status !== "none") return {error:"A game is already running."}; return {g: openLobby(g.settings)};
    case "cap": g.settings.castCap = Math.max(4, Math.min(MAX_PLAYERS, Number(args.n) || 4)); return {g};
    case "deal": { const e = deal(g); return e ? {error:e} : {g}; }
    case "open": openVote(g); return {g};
    case "close": closeVote(g); return {g};
    case "toggle": hostToggle(g, args.id); return {g};
    case "timer": {
      const secs = Number(args.seconds) || 0;
      g.timer = secs > 0 ? {endsAt:Date.now() + secs*1000, seconds:secs} : null;
      return {g};
    }
    case "wipe": { const b = blankGame(); b.settings = g.settings; return {g:b}; }
    default: return {error:"Unknown command."};
  }
}


/* =========================================================
   TROUPE (bios, motives, secrets, and rumors stay on the server)
   ========================================================= */
const CHARACTERS = [
  {name:"Madame Zora", job:"Fortune Teller", look:{hat:"turban"},
   bio:"You read palms in the purple tent. You have never been wrong, according to you. You charge extra for good news.",
   motive:"Silas wants your tent for a dunk tank. He says it tests better.",
   secret:"Your crystal ball is fake. Your nephew feeds you the answers.",
   rumor:"You heard Ollie Pratt sobbing in his trailer the day a school group came through."},
  {name:"Ollie Pratt", job:"Clown", look:{face:"clown", hair:"curly"},
   bio:"Twenty years of pies and horns. The little car holds eleven people. You have never once been the eleventh.",
   motive:"Silas cut your act to four minutes and gave the rest to a goat.",
   secret:"You are terrified of children.",
   rumor:"You saw Vera Lux buying two of every costume."},
  {name:"Vera Lux", job:"Tightrope Walker", look:{hair:"bun"},
   bio:"Forty feet up, no net, every night. The crowd loves you. The insurance company does not.",
   motive:"Silas refused to buy a net after your fall last spring. Cheaper than a funeral, you told him. He disagreed.",
   secret:"You have not walked the rope in a year. Your twin sister performs in your place.",
   rumor:"You saw Dr. Thistle pouring grape soda into his tonic bottles behind the tent."},
  {name:"Dr. Ignatius Thistle", job:"Tonic Salesman", look:{hat:"bowler", beard:"mustache"},
   bio:"You sell a cure for baldness, heartbreak, and gout. The doctorate is self-awarded. So is the confidence.",
   motive:"Silas threatened to report you to the county health board.",
   secret:"Your tonic is fake, and you are not a real doctor.",
   rumor:"You noticed the ticket booth till comes up short every Friday. Mabel Finch counts it."},
  {name:"Mabel Finch", job:"Ticket Booth", look:{hair:"bun"},
   bio:"Eleven years at the gate. You remember every face. You like very few.",
   motive:"Silas caught you stealing and plans to fire you on Monday.",
   secret:"You have been stealing from the ticket booth to buy back your father's carousel.",
   rumor:"You heard roaring from Bruno Kask's trailer, and his lion was supposedly sold."},
  {name:"Bruno Kask", job:"Lion Tamer", look:{beard:"full"},
   bio:"You wear your scars like medals and talk to your lion like an old friend. The lion never talks back, which you respect.",
   motive:"Silas sold your lion to a private zoo without asking.",
   secret:"You stole your lion back. It is hidden in your trailer.",
   rumor:"You watched Pip Malloy stop the Ferris wheel for ten minutes at midnight, then come down alone looking miserable."},
  {name:"Pip Malloy", job:"Ferris Wheel Operator",
   bio:"You know where every car is at every moment. You have never ridden the wheel yourself. Heights.",
   motive:"Silas owes you three months of wages and keeps saying next week.",
   secret:"You proposed to someone on the Ferris wheel at midnight, and she said no.",
   rumor:"You saw Lottie Grimm unpack her swords from a toy chest."},
  {name:"Lottie Grimm", job:"Sword Swallower", look:{hair:"long"},
   bio:"Sharp tongue. Sharper blades, supposedly. Nobody has ever asked to check.",
   motive:"Silas is your ex-husband. He kept the ring, the trailer, and the dog.",
   secret:"Your swords are rubber.",
   rumor:"You saw Hester Moss shaking hands with the owner of a rival carnival."},
  {name:"Hester Moss", job:"Bearded Lady", look:{hair:"long", beard:"full"},
   bio:"Best beard on the circuit. You have three ribbons from the county fair to prove it.",
   motive:"Silas puts your face on every poster and has never paid you a cent for it.",
   secret:"You are leaving to join a rival carnival.",
   rumor:"You have seen Gus Ember flinch every time someone strikes a match."},
  {name:"Gus Ember", job:"Fire Breather",
   bio:"You breathe fire twice a night. You have lost both eyebrows and one engagement to the craft.",
   motive:"Silas cut the safety budget, and you are the one who catches fire.",
   secret:"You are afraid of fire.",
   rumor:"You watched Delphine Rook walk straight into a tent pole in broad daylight."},
  {name:"Delphine Rook", job:"Knife Thrower", look:{hair:"long"},
   bio:"You never miss. Your assistants would like it noted that never is doing a lot of work in that sentence.",
   motive:"Silas fired your last assistant for asking questions. The assistant was your brother.",
   secret:"You are nearly blind in one eye.",
   rumor:"You heard someone singing opera in Marcel Fenn's trailer. Marcel does not speak."},
  {name:"Marcel Fenn", job:"Mime", look:{face:"mime", hat:"bowler"},
   bio:"You have not said a word in public in nine years. You communicate entirely in disappointment.",
   motive:"Silas called mime a dead art in the local paper. By name.",
   secret:"You sing opera in your trailer every night.",
   rumor:"You saw Ingrid Vos carry her pillow into the prop tent at closing time."},
  {name:"Ingrid Vos", job:"Contortionist", look:{hair:"bun"},
   bio:"You can fold yourself into a suitcase. You have, for money, more than once.",
   motive:"Silas sold the rights to your act to a cruise line without telling you.",
   secret:"You lost your trailer and sleep in the prop tent.",
   rumor:"You saw Cecil Drabb open the safe and shut it again fast, like he did not want anyone to see inside."},
  {name:"Cecil Drabb", job:"Bookkeeper", look:{hair:"bald"},
   bio:"You are the only person here who owns a calculator, and the only one who knows the safe combination.",
   motive:"Silas is about to have the books audited.",
   secret:"The carnival safe is empty, and you know it.",
   rumor:"You spotted an old wedding photo of a young Silas in Rosalind Tate's booth."},
  {name:"Rosalind Tate", job:"Cotton Candy Vendor", look:{hair:"curly"},
   bio:"You spin sugar into clouds from noon to midnight. You permanently smell of pink.",
   motive:"Silas raised your booth rent three times this year.",
   secret:"You are Silas's first wife.",
   rumor:"You noticed Jasper Quill's lips were not moving during the evening call."},
  {name:"Jasper Quill", job:"Barker", look:{hat:"bowler", beard:"mustache"},
   bio:"Your voice is a trumpet. You can sell a ticket to a man walking the other way.",
   motive:"Silas promised you a stake in the carnival. Then he promised it to someone else.",
   secret:"You lost your voice. Your shows are a recording.",
   rumor:"You noticed the goats keep disappearing, and Nell Bramble keeps walking into the woods at night."},
  {name:"Nell Bramble", job:"Animal Keeper", look:{hair:"long"},
   bio:"You feed everything with four legs and a few things with more. You prefer the animals. You say so often.",
   motive:"Silas plans to sell the petting zoo to cover a debt.",
   secret:"You have been secretly setting the animals free.",
   rumor:"You found a receipt from an antique dealer in Theo Varga's toolbox."},
  {name:"Theo Varga", job:"Carousel Mechanic", look:{beard:"full"},
   bio:"You keep the carousel turning with wire, spit, and language that would make a sailor blush.",
   motive:"Silas refused to pay for parts, then blamed you when a horse fell off.",
   secret:"You have been selling the real carousel horses and replacing them with fakes.",
   rumor:"You saw Penny Thorne leave Silas's trailer and lock the door behind her."},
  {name:"Penny Thorne", job:"Hall of Mirrors", look:{hair:"short"},
   bio:"You know every angle in the Hall of Mirrors. You avoid your own reflection out of habit.",
   motive:"Silas wants to tear the Hall down and pave it for parking.",
   secret:"You have a key to every trailer, including Silas's.",
   rumor:"You saw the Great Augustin's assistant practicing his big trick alone."},
  {name:"The Great Augustin", job:"Magician", look:{hat:"top", beard:"mustache"},
   bio:"You saw a woman in half twice a night. You have not put one back wrong. Yet.",
   motive:"Silas sold the secret of your best trick to a rival magician.",
   secret:"You cannot perform tricks anymore. Your assistant does all of it.",
   rumor:"You found a crate of props in Wren Saltz's trailer labeled with a stage name that is not yours."},
  {name:"Wren Saltz", job:"Magician's Assistant", look:{hair:"bun"},
   bio:"You get sawed in half for minimum wage and smile the whole time. That is the real trick.",
   motive:"Silas refuses to give you an act of your own.",
   secret:"You are the real magician, and you plan to quit and take the act with you.",
   rumor:"You noticed the pickpockets always work the crowd right under Barnaby Hollis."},
  {name:"Barnaby Hollis", job:"Stilt Walker", look:{hat:"top"},
   bio:"Nine feet tall, counting the stilts. You see everything over the crowd and say less than you see.",
   motive:"Silas made you walk in the rain. You slipped, and your knee has not been right since.",
   secret:"You help pickpockets pick their targets.",
   rumor:"You saw Flora Dunmore searching under trailers with a flashlight and a sack."},
  {name:"Flora Dunmore", job:"Snake Charmer", look:{hat:"turban"},
   bio:"You wear a python like a scarf. The python has opinions about this.",
   motive:"Silas tried to sell your python to a pet store. He said it was not pulling its weight.",
   secret:"Your real cobra escaped and is loose on the grounds.",
   rumor:"You noticed Otto Grieve and Silas have the exact same unfortunate nose."},
  {name:"Otto Grieve", job:"Groundskeeper", look:{hair:"bald", beard:"full"},
   bio:"You were here before Silas. You plan to be here after. You do not say that part out loud.",
   motive:"Silas promised you the land in his will. Then he changed the will.",
   secret:"You are Silas's half-brother.",
   rumor:"You saw Marisol Vane wearing a wedding ring on a chain under her costume."},
  {name:"Marisol Vane", job:"Trapeze Artist", look:{hair:"long"},
   bio:"You fly without wings and land without complaint. Mostly.",
   motive:"Silas fired your catcher mid-season. You have been catching yourself ever since.",
   secret:"You are secretly married, and Pip proposed to you.",
   rumor:"You saw Ezra Coil panic when someone shoved him toward the duck pond."},
  {name:"Ezra Coil", job:"Escape Artist", look:{hair:"mohawk"},
   bio:"You have escaped handcuffs, straitjackets, and a marriage. The marriage took longest.",
   motive:"Silas owes you two thousand dollars from a bet and pretends to forget.",
   secret:"You cannot swim.",
   rumor:"You found a stolen wallet sewn into the lining of a costume Imogen Pell made."},
  {name:"Imogen Pell", job:"Seamstress", look:{hair:"bun"},
   bio:"You sew every sequin in the show. You know everyone's measurements, and therefore everyone's business.",
   motive:"Silas has paid you in exposure for six years.",
   secret:"You sew hidden pockets into costumes for pickpockets.",
   rumor:"You noticed all of Horace Bell's songs sound the same if you really listen."},
  {name:"Horace Bell", job:"Organ Grinder", look:{hat:"bowler", beard:"mustache"},
   bio:"You play six songs on a hand-cranked organ. You have strong opinions about all six.",
   motive:"Silas banned you from the midway for playing funeral music.",
   secret:"You only know one song.",
   rumor:"You saw Clementine Ash stitching two stuffed calves together at two in the morning."},
  {name:"Clementine Ash", job:"Oddities Curator", look:{hair:"long"},
   bio:"You run the Museum of Oddities. Half the exhibits are real. You will not say which half.",
   motive:"Silas sold your two-headed calf to a collector to cover a gambling debt.",
   secret:"Your two-headed calf is fake. You made it.",
   rumor:"You saw Wally Dunn climb out from under the net, dry as a bone, right after the cannon fired."},
  {name:"Wally Dunn", job:"Human Cannonball", look:{hair:"short"},
   bio:"You get shot out of a cannon at six and nine. You do not remember most of last year.",
   motive:"Silas cut corners on the cannon. Last week it misfired.",
   secret:"You fake your cannon act. The cannon fires a dummy.",
   rumor:"You see Opal Fairweather mail a letter to the newspaper every Monday."},
  {name:"Opal Fairweather", job:"Funnel Cake Fryer", look:{hair:"curly"},
   bio:"You have fried dough in the same oil since spring. You call it seasoned.",
   motive:"Silas plans to replace you with a vending machine.",
   secret:"You write the bad reviews of the carnival in the newspaper.",
   rumor:"You heard snoring coming from the coffin on the Ghost Train."},
  {name:"Felix Marrow", job:"Ghost Train Operator", look:{hat:"top"},
   bio:"Ten years of screaming have made you very, very calm.",
   motive:"Silas plans to shut the Ghost Train down after a kid got stuck inside.",
   secret:"You secretly live on the Ghost Train.",
   rumor:"You saw Agnes Pike at the ring toss with a tube of superglue."},
  {name:"Agnes Pike", job:"Ring Toss Operator", look:{hair:"bun"},
   bio:"Nobody has won the big bear at your ring toss since 2011.",
   motive:"Silas takes sixty percent of your booth's take.",
   secret:"You glue the bottles down at the ring toss.",
   rumor:"You saw Tobias Wick run a long cable into the woods toward town."},
  {name:"Tobias Wick", job:"Electrician", look:{hair:"short"},
   bio:"You keep the lights on, the wires live, and your opinions to yourself. Mostly.",
   motive:"Silas skipped the safety inspection and blamed you for it.",
   secret:"You steal the carnival's power from the town.",
   rumor:"You saw Juniper Hale writing down everyone's names in a tiny notebook."},
  {name:"Juniper Hale", job:"The New Hire", look:{hair:"short"},
   bio:"You joined three weeks ago. Nobody is sure what your act is. Neither are you.",
   motive:"Silas hired you, then forgot your name. Every day.",
   secret:"You are an undercover reporter.",
   rumor:"You heard voices coming from under the floor of Madame Zora's tent."}
];


/* =========================================================
   NETLIFY FUNCTION
   One game lives in one blob. Every change is a read, apply,
   conditional write: if another phone saved first, the write
   is rejected and the action is retried on the newer state.
   ========================================================= */
const STORE_NAME = "midnight-carnival";
const KEY = "game";
const adminPin = () => (globalThis.Netlify?.env?.get?.("ADMIN_PIN")) || process.env.ADMIN_PIN || "5112";
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json", "cache-control":"no-store"}});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function readGame(store){
  const rec = await store.getWithMetadata(KEY, {type:"json"});
  return rec && rec.data ? {g:rec.data, etag:rec.etag} : {g:blankGame(), etag:null};
}

// Applies fn to the newest game state and saves it, retrying when another request got there first.
async function mutate(store, fn){
  for (let attempt = 0; attempt < 25; attempt++) {
    const {g, etag} = await readGame(store);
    const result = fn(g) || {};
    if (result.skip) return result;
    const next = result.g || g;
    const res = etag ? await store.setJSON(KEY, next, {onlyIfMatch:etag}) : await store.setJSON(KEY, next, {onlyIfNew:true});
    if (!res || res.modified !== false) return {...result, g:next};
    await sleep(10 + Math.random() * 40 * Math.min(attempt + 1, 6));
  }
  return {error:"The carnival is busy. Try again.", busy:true};
}

const authed = (g, pid, token) => { const p = g.players.find(x => x.id === pid); return p && p.token === token ? p : null; };

export default async (req) => {
  const store = getStore({name:STORE_NAME, consistency:"strong"});
  const url = new URL(req.url);
  const isAdmin = req.headers.get("x-admin-pin") !== null;
  if (isAdmin && req.headers.get("x-admin-pin") !== adminPin()) return json({error:"Wrong PIN."}, 401);

  if (req.method === "GET") {
    const {g} = await readGame(store);
    if (isAdmin) return json(adminView(g));
    const pid = url.searchParams.get("pid"), token = url.searchParams.get("t");
    return json(view(g, authed(g, pid, token) ? pid : null));
  }

  if (req.method !== "POST") return json({error:"Method not allowed."}, 405);
  let body; try { body = await req.json(); } catch { return json({error:"Bad request."}, 400); }

  if (isAdmin) {
    const r = await mutate(store, g => { const out = admin(g, body.cmd, body.args || {}); return out.error ? {skip:true, error:out.error} : out; });
    if (r.error) return json({error:r.error}, r.busy ? 503 : 400);
    return json(adminView(r.g));
  }

  if (body.op === "join") {
    const name = String(body.name || "").trim().slice(0, 24);
    if (!name) return json({error:"Tell us your name first."}, 400);
    let made = null;
    const r = await mutate(store, g => { const out = join(g, name); if (out.error) return {skip:true, error:out.error}; made = out.player; return {}; });
    if (r.error) return json({error:r.error}, r.busy ? 503 : 400);
    return json({pid:made.id, token:made.token, view:view(r.g, made.id)});
  }

  if (body.op === "rejoin") {
    const code = String(body.code || "").trim().toUpperCase();
    const {g} = await readGame(store);
    const p = g.players.find(x => x.code === code);
    if (!p) return json({error:"That code does not match anyone."}, 404);
    return json({pid:p.id, token:p.token, view:view(g, p.id)});
  }

  if (body.op === "act") {
    let err = null;
    const r = await mutate(store, g => {
      if (!authed(g, body.pid, body.token)) return {skip:true, error:"Your ticket is not valid. Ask the host for your rejoin code."};
      err = act(g, body.pid, body.kind, body.data || {});
      return err ? {skip:true, error:err} : {};
    });
    if (r.error) { const {g} = await readGame(store); return json({error:r.error, view:view(g, authed(g, body.pid, body.token) ? body.pid : null)}, r.busy ? 503 : 200); }
    return json({view:view(r.g, body.pid)});
  }

  return json({error:"Unknown request."}, 400);
};

export const config = { path: "/api/game" };
