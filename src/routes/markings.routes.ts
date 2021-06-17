import { classToPlain, plainToClass } from 'class-transformer';
import { Router } from 'express';
import StatusCode from 'status-code-enum';
import { KeyValuePair, KlintStorage } from '../classes/KlintStorage';
import MarkingData from '../entities/MarkingData';
import UpdatesServer from '../routes/updates.server';

class MarkingsRoutes {
  private static markingsRouter = Router();
  private static writeRights = new Map<string, string>();

  public static get router(): Router {
    this.markingsRouter = Router();
    this.setup();
    return this.markingsRouter;
  }

  private static setup() {
    //  GET ALL
    this.markingsRouter.get('/:p/:c', async (request, response) => {
      const projectId = request.params.p;
      const collectionId = request.params.c;
      let data: KeyValuePair[] = [];
      KlintStorage.markingDatas.forEach((value, key) => {
        if (key.startsWith(KlintStorage.toCompoundKey([projectId, collectionId]))) {
          data.push({ key: key.toString(), value: value });
        }
      });
      return response.json(data);
    });

    //  GET BY ID
    this.markingsRouter.get('/:p/:c/:m', async (request, response) => {
      const projectId = request.params.p;
      const collectionId = request.params.c;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey([projectId, collectionId, mediaId]);
      const m = KlintStorage.markingDatas.get(key);
      if (!m) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        return response.json({ key: key, value: m });
      }
    });

    //  OBTAIN WRITE ACCESS BY ID
    this.markingsRouter.get('/:p/:c/:m/write', async (request, response) => {
      let username = request.username;
      const projectId = request.params.p;
      const collectionId = request.params.c;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey([projectId, collectionId, mediaId]);
      let currentOwner = this.writeRights.get(key);
      if ((currentOwner && (currentOwner == username)) || !currentOwner) {
        this.writeRights.set(key, username);
        return response.sendStatus(StatusCode.SuccessOK);
      } else {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }
    });

    //  RELEASE WRITE ACCESS BY ID
    this.markingsRouter.get('/:p/:c/:m/release', async (request, response) => {
      let username = request.username;
      const projectId = request.params.p;
      const collectionId = request.params.c;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey([projectId, collectionId, mediaId]);
      let currentOwner = this.writeRights.get(key);
      if (currentOwner && currentOwner == username) {
        this.writeRights.delete(key);
        return response.sendStatus(StatusCode.SuccessOK);
      } else {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      }
    });

    // PUT BY ID
    this.markingsRouter.put('/:p/:c/:m', async (request, response) => {
      const projectId = request.params.p;
      const collectionId = request.params.c;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey([projectId, collectionId, mediaId]);
      const username = request.username;

      //  Reject if someone else has obtained rights
      if (this.writeRights.has(key) && this.writeRights.get(key) != username) {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }

      //  TODO: Check for consistency
      let isValid = true;
      if (!isValid) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        KlintStorage.markingDatas.set(key, plainToClass(MarkingData, request.body));
        KlintStorage.alterations++;
        UpdatesServer.notifyEntityUpdate(request.username, 'MarkingData', [projectId, collectionId, mediaId], false);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });

    // DELETE BY ID
    this.markingsRouter.delete('/:p/:c/:m', async (request, response) => {
      const projectId = request.params.p;
      const collectionId = request.params.c;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey([projectId, collectionId, mediaId]);
      const username = request.username;

      //  Reject if someone else has obtained rights
      if (this.writeRights.has(key) && this.writeRights.get(key) != username) {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }

      let wasDeleted = KlintStorage.markingDatas.delete(key);

      if (!wasDeleted) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        KlintStorage.alterations++;
        UpdatesServer.notifyEntityUpdate(request.username, 'MarkingData', [projectId, collectionId, mediaId], true);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }
}

export default MarkingsRoutes;