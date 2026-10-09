// Xona holati xotirada. Redis'ga o'tilganda faqat shu fayl o'zgaradi.
const rooms = new Map(); // code -> room
const dirty = new Set(); // o'zgargan xonalar kodlari

export function getRoom(code) {
  return rooms.get(code) ?? null;
}

export function setRoom(room) {
  rooms.set(room.code, room);
}

export function deleteRoom(code) {
  rooms.delete(code);
  dirty.delete(code);
}

export function markDirty(code) {
  if (rooms.has(code)) dirty.add(code);
}

// O'zgargan xonalarni olib, navbatni tozalaydi
export function takeDirtyRooms() {
  const list = [];
  for (const code of dirty) {
    const room = rooms.get(code);
    if (room) list.push(room);
  }
  dirty.clear();
  return list;
}

export function allRooms() {
  return rooms.values();
}