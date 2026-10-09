// Foydalanish: node scripts/emit.js <token> <event> '<payload_json>'
import { io } from 'socket.io-client';

const [, , token, event, rawPayload = '{}'] = process.argv;

const socket = io(process.env.WS_URL || 'http://localhost:3000', { auth: { token } });

socket.onAny((name, ...args) => {
  console.log(name, JSON.stringify(args));
});

socket.on('connect_error', (e) => {
  console.log('connect_error:', e.message);
  process.exit(1);
});

socket.on('connect', () => {
  socket.emit(event, JSON.parse(rawPayload), (ack) => {
    console.log('ack:', JSON.stringify(ack));
  });
});

setTimeout(() => {
  socket.close();
  process.exit(0);
}, Number(process.env.WAIT_MS) || 2000);