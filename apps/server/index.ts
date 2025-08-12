import { ee } from '@ll-xq/trpc';
import { serverConfig } from './config';
import { createServer } from './server';

const server = createServer(serverConfig);

void server.start();

let counter = 0;
const interval = setInterval(() => {
  console.log(`Event ${counter} emitted`);
  ee.emit('add', { hello: 'world', counter });
  counter++;
  if (counter >= 10) {
    clearInterval(interval);
  }
}, 5000);
