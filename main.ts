import express from 'express';
import { Request, Response, Router } from 'express';
import fs from 'fs';
import https from 'https';
import 'reflect-metadata';
import fileUpload from 'express-fileupload'
import { KlintStorage } from './src/classes/KlintStorage';
import ProjectsRoutes from './src/routes/projects.routes';
import MarkingsRoutes from './src/routes/markings.routes';
import path from 'path';

//  Config
const PORT = 4242;
const insertDummyData = true;


//Middleware so we can access request.body
const app = express();
app.use(express.json());


//  Log Response Time and Request to Console
app.use((req, res, next) => {
  const start = new Date().getTime();
  console.log(`${req.method} ${decodeURI(req.originalUrl)}`);
  res.on('finish', () => { console.log('Response Time: ' + (new Date().getTime() - start) + 'ms'); });
  next();
});


//Setup File Uploading
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '/storage/tmp/'),
  debug: false,
  safeFileNames: true,
  preserveExtension: 4
}));


//  Setup Routes
app.use('/static', express.static('storage/static'));
app.get('/', (req: Request, res: Response) => res.send('Hello from the Klint Backend!'));
app.use('/projects', ProjectsRoutes.router);
app.use('/markings', MarkingsRoutes.router);


//  Restore Data
if (fs.existsSync(KlintStorage.projectsPath)) {
  try {
    KlintStorage.restoreFromDisk();
  } catch (error) {
    console.log(error);
  }
} else {
  if (insertDummyData) {
    KlintStorage.addDummyData();
  }
}
KlintStorage.autoSave();


//  Go live.
https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app).listen(4242, () => {
  console.log(`Running: https://localhost:${PORT}`);
});