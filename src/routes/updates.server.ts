import { strict } from "assert";
import { time } from "console";
import jwt from "jsonwebtoken";
import { type } from "os";
import { stringify } from "querystring";
import WebSocket from "ws";
import ws from "ws";
import User from "../entities/User";
//import User from "../entities/User";

enum UpdateMessageType {
  UserStatusChange = 'user_status_changed',
  EntityChange = 'entity_changed'
}
enum UserStatus { Active = 'active', Inactive = 'inactive', offline = 'offline' };
type StatusUpdateMessage = { type: 'StatusUpdate', user: string, status: UserStatus };
type EntityUpdateMessage = { type: 'EntityUpdate', user: string, entityType: string, primaryKey: unknown[], deleted: boolean };
type UpdateMessage = StatusUpdateMessage | EntityUpdateMessage;

class UpdatesServer {
  public static server = new ws.Server({ noServer: true });
  private static clientPongTimeStamps: Map<string, number>;
  private static clients: Map<string, WebSocket>;
  private static timeout: number = 2000;
  private static lastPing: number;

  static init() {
    UpdatesServer.server.on('connection', (socket, request) => {
      let tokenHeader: string | undefined = request.headers.authorization;

      if (tokenHeader) {
        let payload: any = jwt.decode(tokenHeader.split(' ')[1], { json: true });
        let username: string = payload?.user;
        if (username) {
          if (UpdatesServer.clients.has(username)) {
            console.log('User is switching location.');
            UpdatesServer.clients.get(username)?.close(1001, 'Client logged in from another location.');

          }
          UpdatesServer.clients.set(username, socket);
          console.log('Socket opened: ' + username);

          socket.on('message', message => {
            console.log('Incoming from ' + username + ': ' + message);
            socket.send('Received: ' + message);
          });

          socket.on('pong', message => {
            UpdatesServer.clientPongTimeStamps.set(username, new Date().getTime());
          });

          socket.on('ping', message => {
          });

          socket.on('close', (code, reason) => {
            console.log('Socket closed: ' + username);
            if (UpdatesServer.clients.get(username) == socket) {
              //  Don't remove client if he switched locations.
              UpdatesServer.clients.delete(username);
            }
            UpdatesServer.clientPongTimeStamps.delete(username);
          });

        }
      } else {
        socket.close(1008, 'Authorization Token is required.');
      }

    });
    UpdatesServer.clients = new Map<string, WebSocket>();
    UpdatesServer.clientPongTimeStamps = new Map<string, number>();
    setTimeout(UpdatesServer.checkSocketHealth, UpdatesServer.timeout);
  }

  private static sendToAllClients(message: ws.Data) {
    UpdatesServer.clients.forEach((client: WebSocket, username: string) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public static notifyEntityUpdate(user: string, entityType: string, primaryKey: unknown[], deleted: boolean) {
    let message: EntityUpdateMessage = {
      type: 'EntityUpdate',
      user: user,
      entityType: entityType,
      primaryKey: primaryKey,
      deleted: deleted
    }
    this.sendToAllClients(JSON.stringify(message));
  }

  static pushUserStatus(user: string, status: UserStatus) {
    let message: StatusUpdateMessage = {
      type: 'StatusUpdate',
      user: user,
      status: status
    }
    this.sendToAllClients(JSON.stringify(message));
  }

  private static checkSocketHealth() {
    this.lastPing = Date.now();
    UpdatesServer.clients.forEach((socket: WebSocket, username: string) => {
      let lastReceivedPong = UpdatesServer.clientPongTimeStamps.get(username);
      if (!lastReceivedPong) {
        UpdatesServer.clientPongTimeStamps.set(username, this.lastPing);
      }
      if (lastReceivedPong && ((lastReceivedPong - this.lastPing) > UpdatesServer.timeout)) {
        console.log('Client timed out: ' + username);
        socket.close(1001, 'Client timed out.');
      } else {
        socket.ping();
      }
    });
    setTimeout(UpdatesServer.checkSocketHealth, UpdatesServer.timeout)
  }
}
export default UpdatesServer;