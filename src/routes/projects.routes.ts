import { plainToClass } from 'class-transformer';
import { Router } from 'express';
import StatusCode from 'status-code-enum';
import { KeyValuePair, KlintStorage } from '../classes/KlintStorage';
import { Project } from '../entities/Project';

class ProjectsRoutes {
  private static projectsRouter = Router();

  public static get router(): Router {
    this.projectsRouter = Router();
    this.setup();
    return this.projectsRouter;
  }


  static setup() {
    //  GET ALL
    this.projectsRouter.get('/', async (request, response) => {
      let data: KeyValuePair[] = [];
      KlintStorage.projects.forEach((value, key) => {
        data.push({ key: key, value: value });
      });
      return response.json(data);
    });

    //  GET BY ID
    this.projectsRouter.get('/:id', async (request, response) => {
      const e = KlintStorage.projects.get(request.params.id);
      if (!e) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        const out: KeyValuePair = { key: request.params.id, value: e }
        return response.json(out);
      }
    });


    // PUT BY ID
    this.projectsRouter.put('/:id', async (request, response) => {
      //  TODO: Check for consistency
      let isValid = true;

      if (!isValid) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        KlintStorage.projects.set(request.params.id, plainToClass(Project, request.body));
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });


    //  DELETE BY ID
    this.projectsRouter.delete('/:id', async (request, response) => {
      const wasDeleted = KlintStorage.projects.delete(request.params.id);
      if (!wasDeleted) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }

}

export default ProjectsRoutes;