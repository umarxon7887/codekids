// Foydalanish: node scripts/socket-test.js <token> <kod> [event] [payload_json]
import { io } from 'socket.io-client';

const [, , token, code, event, rawPayload] = process.argv;

const socket = io(process.env.WS_URL || 'http://localhost:3000', {
  auth: { token },
});

socket.on('connect', () => {
  console.log('ulandi:', socket.id);
  socket.emit('room:join', { code }, (ack) => {
    console.log('room:join:', JSON.stringify(ack));
    if (event) {
      const payload = rawPayload ? JSON.parse(rawPayload) : { code };
      socket.emit(event, payload, (ack2) => console.log(`${event}:`, JSON.stringify(ack2)));
    }
  });
});

socket.on('room:snapshot', (s) => console.log('snapshot:', JSON.stringify(s)));
socket.on('app:error', (e) => console.log('xato:', JSON.stringify(e)));
socket.on('connect_error', (e) => {
  console.log('connect_error:', e.message);
  process.exit(1);
});

setTimeout(() => socket.close(), 3000);