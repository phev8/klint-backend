import express from 'express';
import { Request, Response, Router } from 'express';
import fs from 'fs';
import https from 'https';
import 'reflect-metadata';
import { KlintStorage } from './src/classes/KlintStorage';
import ProjectsRoutes from './src/routes/projects.routes';
import MarkingsRoutes from './src/routes/markings.routes';

const app = express();
const PORT = 4242;

//  Log Response Time and Request to Console
app.use((req, res, next) => {
  const start = new Date().getTime();
  console.log(`${req.method} ${req.originalUrl}`);
  res.on('finish', () => { console.log('Response Time: ' + (new Date().getTime() - start) + 'ms'); });
  next();
});

//  Setup Routes
app.use('/static', express.static('static'));
app.get('/', (req: Request, res: Response) => res.send('Hello from the Klint Backend!'));
app.use('/projects', ProjectsRoutes.router);
app.use('/markings', MarkingsRoutes.router);

//  Restore Database
try {
  KlintStorage.restoreFromDisk();
} catch (error) {
  //  Initialize Database
  KlintStorage.addDummyData();
  KlintStorage.saveToDisk();
  KlintStorage.restoreFromDisk();
}

//  Go live.
https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app).listen(4242, () => {
  console.log(`Running: https://localhost:${PORT}`);
});