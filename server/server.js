import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { getNews, getTicker } from './controllers.js';

const app = express();
const clientDir = fileURLToPath(new URL('../client/', import.meta.url));
const indexPath = path.join(clientDir, 'index.html');

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static(clientDir));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

app.post('/getNews', getNews);

app.post('/getTicker', getTicker);

if (import.meta.main) {
  const port = process.env.PORT || 3000;
  const keepAlive = typeof Bun !== 'undefined' ? setInterval(() => {}, 2147483647) : null;
  const server = app.listen(port, () => {
    console.log(`Company News Cruncher running at http://localhost:${port}`);
  });

  server.on('close', () => {
    if (keepAlive) clearInterval(keepAlive);
  });
}

export default app;
