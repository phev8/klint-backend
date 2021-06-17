import express, { NextFunction, response } from 'express';
import { Request, Response, Router } from 'express';
import fs from 'fs';
import 'reflect-metadata';
import fileUpload from 'express-fileupload'
import { KlintStorage } from './src/classes/KlintStorage';
import ProjectsRoutes from './src/routes/projects.routes';
import MarkingsRoutes from './src/routes/markings.routes';
import UpdatesServer from './src/routes/updates.server';
import path from 'path';
import cors from 'cors';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import User from './src/entities/User';
import StatusCode from 'status-code-enum';
import ws from 'ws';
import { Socket } from 'net';

declare global {
	namespace Express {
		interface Request {
			username: string;
		}
	}
}

//  Config
const PORT = 4242;
const requireAuthentification = false;
const insertDummyData = true;
const resetOnStartUp = true;


//	Middleware so we can access request.body
const app = express();
app.use(express.json(), cors());


//  Log Response Time and Request to Console
app.use((req, res, next) => {
	const start = new Date().getTime();
	console.log(`${req.method} ${decodeURI(req.originalUrl)}`);
	res.on('finish', () => { console.log('Response Time: ' + (new Date().getTime() - start) + 'ms'); });
	next();
});


//	Setup File Uploading
app.use(fileUpload({
	useTempFiles: true,
	tempFileDir: path.join(__dirname, '/storage/tmp/'),
	debug: false,
	safeFileNames: true,
	preserveExtension: 4
}));


//	Middleware for Authorization and Authentification
//	app.use(jwt({ secret: getPersonalSecret, algorithms: ['HS256'] }).unless({ path: ['/auth'] }));
const authorisationJWT = (req: Request, res: Response, next: NextFunction) => {

	let authHeader = req.headers.authorization;
	req.username = "";

	//	Header exists
	if (authHeader) {
		//	This should be the JWT
		let token: any = authHeader.split(' ')[1];
		let payload = jwt.decode(token, { json: true });
		let user = KlintStorage.users.get(payload?.user);
		if (user && jwt.verify(token, user.jwtSecret)) {
			console.log('Authenticated: ' + payload?.user + ' (' + user.screenName + ')')
			req.username = payload?.user;
			next();
		} else {
			console.log('Authentification failed: ' + payload);
			res.sendStatus(StatusCode.ClientErrorUnauthorized);
		}
	}

	//	No Authorization Header
	if (!requireAuthentification) {
		next();
	} else {
		res.sendStatus(StatusCode.ClientErrorUnauthorized);
	}
};


//	Endpoint for Authorization and Authentification
app.post('/auth', async (request, response) => {
	const { username, password, screen } = request.body;
	let user: User | undefined = KlintStorage.users.get(username);
	if (!user) {
		return response.sendStatus(StatusCode.ClientErrorNotFound);
	} else {
		let hash = await KlintStorage.getPwHash(password, user.pwSalt);
		if (!(hash === user.pwHash)) {
			return response.sendStatus(StatusCode.ClientErrorUnauthorized);
		} else {
			let payload = { user: username };
			user.jwtSecret = KlintStorage.getSalt();
			let token = jwt.sign(payload, user.jwtSecret, { algorithm: 'HS256', expiresIn: '1m' });
			KlintStorage.users.set(username, user);
			return response.status(StatusCode.SuccessOK).send(token);
		}
	}

});


//  Setup Routes
app.use('/static', express.static('storage/static'));
app.get('/', (req: Request, res: Response) => res.send('Hello from the Klint Backend!'));
app.use('/projects', authorisationJWT, ProjectsRoutes.router);
app.use('/markings', authorisationJWT, MarkingsRoutes.router);
//app.use('/projects', ProjectsRoutes.router);
//app.use('/markings', MarkingsRoutes.router);


//  Restore Data
if (fs.existsSync(KlintStorage.projectsPath) && !resetOnStartUp) {
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

//	Start Server and WebSocket Server
const server = app.listen(4242);
UpdatesServer.init();
server.on('upgrade', (request: Request, socket: Socket, head) => {
	if (request.url == '/updates') {
		UpdatesServer.server.handleUpgrade(request, socket, head, socket => {
			UpdatesServer.server.emit('connection', socket, request);
		});
	} else {
		socket.end();
	}
});


//  Go live.
//	app.listen(4242);

// https.createServer({
// 	key: fs.readFileSync('server.key'),
// 	cert: fs.readFileSync('server.cert')
// }, app).listen(4242, () => {
// 	console.log(`Running: https://localhost:${PORT}`);
// });