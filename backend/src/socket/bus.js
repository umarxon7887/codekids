// Socket.io serverga REST route'lardan kirish uchun (yopish, chiqarish)
let ioRef = null;
export function setIo(io) { ioRef = io; }
export function getIo() { return ioRef; }
