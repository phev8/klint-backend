import { classToPlain, plainToClass } from 'class-transformer';
import { Router } from 'express';
import StatusCode from 'status-code-enum';
import { KeyValuePair, KlintStorage } from '../classes/KlintStorage';
import MarkingData from '../entities/MarkingData';

class MarkingsRoutes {
  private static markingsRouter = Router();

  public static get router(): Router {
    this.markingsRouter = Router();
    this.setup();
    return this.markingsRouter;
  }

  private static setup() {
    //  GET ALL
    this.markingsRouter.get('/:p', async (request, response) => {
      const projectId = request.params.p;
      let data: KeyValuePair[] = [];
      KlintStorage.markingDatas.forEach((value, key) => {
        if (key[0] == projectId) {
          data.push({ key: key.toString(), value: value });
        }
      });
      return response.json(data);
    });

    //  GET BY ID
    this.markingsRouter.get('/:p/:m', async (request, response) => {
      const projectId = request.params.p;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey(projectId, mediaId);
      const m = KlintStorage.markingDatas.get(key);
      if (!m) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        return response.json({ key: key, value: m });
      }
    });

    // PUT BY ID
    this.markingsRouter.put('/:p/:m', async (request, response) => {
      const projectId = request.params.p;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey(projectId, mediaId);
      //  TODO: Check for consistency
      let isValid = true;

      if (!isValid) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        KlintStorage.markingDatas.set(key, plainToClass(MarkingData, request.body));
        KlintStorage.alterations++;
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });

    // DELETE BY ID
    this.markingsRouter.delete('/:p/:m', async (request, response) => {
      const projectId = request.params.p;
      const mediaId = request.params.m;
      const key: string = KlintStorage.toCompoundKey(projectId, mediaId);
      let wasDeleted = KlintStorage.markingDatas.delete(key);

      if (!wasDeleted) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        KlintStorage.alterations++;
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }
}

export default MarkingsRoutes;