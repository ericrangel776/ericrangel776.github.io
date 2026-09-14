// Tiny JSON-file-backed store for the guestbook and hit counter.
// No database server, no native build step — just two flat files under
// server/data/. Fine for a low-traffic personal site; fs.*Sync calls run
// atomically within Node's single-threaded event loop, so concurrent
// requests can't interleave a read/modify/write and lose an update.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GUESTBOOK_FILE = path.join(DATA_DIR, 'guestbook.json');
const HITS_FILE = path.join(DATA_DIR, 'hits.json');
const MAX_GUESTBOOK_ENTRIES = 200;

function ensureFile(file, seed) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(seed, null, 2));
}

function readJson(file, seed) {
  ensureFile(file, seed);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return seed;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getGuestbookEntries() {
  return readJson(GUESTBOOK_FILE, []);
}

function addGuestbookEntry(entry) {
  const entries = getGuestbookEntries();
  entries.push(entry);
  if (entries.length > MAX_GUESTBOOK_ENTRIES) {
    entries.splice(0, entries.length - MAX_GUESTBOOK_ENTRIES);
  }
  writeJson(GUESTBOOK_FILE, entries);
  return entries;
}

function getHits() {
  const data = readJson(HITS_FILE, { count: 0 });
  return data.count || 0;
}

function incrementHits() {
  const data = readJson(HITS_FILE, { count: 0 });
  data.count = (data.count || 0) + 1;
  writeJson(HITS_FILE, data);
  return data.count;
}

module.exports = { getGuestbookEntries, addGuestbookEntry, getHits, incrementHits };
