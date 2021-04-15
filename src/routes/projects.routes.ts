import { plainToClass } from 'class-transformer';
import { Router } from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import StatusCode from 'status-code-enum';
import { KeyValuePair, KlintStorage } from '../classes/KlintStorage';
import { Project } from '../entities/Project';

class ProjectsRoutes {
  private static projectsRouter = Router();

  //  for static storage
  public static options = {
    root: path.join(__dirname, '../../storage/projectFiles')
  }

  public static get router(): Router {
    this.projectsRouter = Router();
    this.setupJSONRoutes();
    this.setupFileRoutes();
    return this.projectsRouter;
  }


  static setupJSONRoutes() {
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
        KlintStorage.alterations++;
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });


    //  DELETE BY ID
    this.projectsRouter.delete('/:id', async (request, response) => {
      const projectID = request.params.id;
      //  Delete Project
      const wasDeleted = KlintStorage.projects.delete(projectID);
      if (!wasDeleted) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        //  Delete MarkingsData for this Project
        KlintStorage.markingDatas.forEach((value, key) => {
          if (key.startsWith(KlintStorage.toCompoundKey(projectID, ''))) {
            KlintStorage.markingDatas.delete(key);
          }
        });
        KlintStorage.alterations++;

        //  Delete stored files for this project
        const folderPath = path.join(ProjectsRoutes.options.root, projectID);
        fs.rmdirSync(folderPath, { recursive: true });
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }


  static setupFileRoutes() {
    //  Get list of available static files
    this.projectsRouter.get('/:id/files/', async (request, response) => {
      const projectID = request.params.id;
      const folderPath = path.join(ProjectsRoutes.options.root, projectID);
      let fileNameList: string[] = [];
      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((value) => {
          fileNameList.push(value);
        });
      }
      response.json(fileNameList);
    });


    //  Get static file
    this.projectsRouter.get('/:id/files/:fileName', async (request, response) => {
      const projectID = request.params.id;
      const fileNameWithExtension = decodeURIComponent(request.params.fileName);
      if (!projectID || !fileNameWithExtension || !fs.existsSync(path.join(ProjectsRoutes.options.root, projectID, fileNameWithExtension))) {
        return response.sendStatus(StatusCode.ClientErrorNotFound)
      } else {
        return response.sendFile(path.join(projectID, fileNameWithExtension), ProjectsRoutes.options);
      }
    });


    //  Post static file
    this.projectsRouter.post('/:id/files/', async (request, response) => {
      const projectID = request.params.id;
      const files: fileUpload.FileArray | undefined = request.files;
      const file = files?.file as fileUpload.UploadedFile;
      if (!KlintStorage.projects.has(projectID)) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      }
      if (!file) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        console.log(file);
        const folderPath = path.join(ProjectsRoutes.options.root, projectID)
        const filePath = path.join(folderPath, file.name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
        }
        file.mv(filePath);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });


    //  Delete static file
    this.projectsRouter.delete('/:id/files/:fileName', async (request, response) => {
      const projectID = request.params.id;
      const fileNameWithExtension = decodeURIComponent(request.params.fileName);
      if (!projectID || !fileNameWithExtension || !fs.existsSync(path.join(ProjectsRoutes.options.root, projectID, fileNameWithExtension))) {
        return response.sendStatus(StatusCode.ClientErrorNotFound)
      } else {
        fs.unlinkSync(path.join(ProjectsRoutes.options.root, projectID, fileNameWithExtension));
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }
}

export default ProjectsRoutes;