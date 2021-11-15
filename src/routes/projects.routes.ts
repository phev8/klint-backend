import { plainToClass } from 'class-transformer';
import { request, response, Router } from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import StatusCode from 'status-code-enum';
import { KeyValuePair, KlintStorage } from '../classes/KlintStorage';
import { Project } from '../entities/Project';
import UpdatesServer from './updates.server';

class ProjectsRoutes {
  private static projectsRouter = Router();
  private static writeRights = new Map<string, string>();

  //  for static storage
  public static options = {
    root: path.join(__dirname, '../../external/storage/projectFiles')
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

    //  OBRTAIN WRITE ACCESS BY ID
    this.projectsRouter.get('/:id/write', async (request, response) => {
      let username = request.username;
      let id = request.params.id;
      let currentOwner = this.writeRights.get(id);
      if ((currentOwner && (currentOwner == username)) || !currentOwner) {
        this.writeRights.set(id, username);
        return response.sendStatus(StatusCode.SuccessOK);
      } else {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }
    });

    //  RELEASE WRITE ACCESS BY ID
    this.projectsRouter.get('/:id/release', async (request, response) => {
      let username = request.username;
      let id = request.params.id;
      let currentOwner = this.writeRights.get(id);
      if (currentOwner && currentOwner == username) {
        this.writeRights.delete(id);
        return response.sendStatus(StatusCode.SuccessOK);
      } else {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      }
    });

    // PUT BY ID
    this.projectsRouter.put('/:id', async (request, response) => {
      const projectID = request.params.id;
      const username = request.username;

      //  Reject if someone else has obtained rights
      if (this.writeRights.has(projectID) && this.writeRights.get(projectID) != username) {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }

      //  TODO: Check for consistency
      let isValid = true;
      if (!isValid) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        KlintStorage.projects.set(projectID, plainToClass(Project, request.body));
        KlintStorage.alterations++;
        UpdatesServer.notifyEntityUpdate(request.username, 'Project', [projectID], false);

        // Delete file folder if the corresponding collection is no longer part of this project.
        let collectionsFolder = path.join(ProjectsRoutes.options.root, projectID)
        if (fs.existsSync(collectionsFolder)) {
          fs.readdirSync(collectionsFolder).forEach((entry) => {
            if (fs.statSync(path.join(collectionsFolder, entry)).isDirectory()) {
              if (!KlintStorage.projectHasCollection(projectID, entry)) {
                let collectionPath = path.join(collectionsFolder, entry);
                fs.rmdirSync(collectionPath, { recursive: true });
                console.log('Removed file / folder for consistency: ' + collectionPath);
              }
            }
          });
        }
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });


    //  DELETE BY ID
    this.projectsRouter.delete('/:id', async (request, response) => {
      const projectID = request.params.id;
      const username = request.username;

      //  Reject if someone else has obtained rights
      if (this.writeRights.has(projectID) && this.writeRights.get(projectID) != username) {
        return response.sendStatus(StatusCode.ClientErrorLocked);
      }

      //  Delete Project
      const wasDeleted = KlintStorage.projects.delete(projectID);
      if (!wasDeleted) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      } else {
        //  Delete MarkingsData for this Project
        KlintStorage.markingDatas.forEach((value, key) => {
          if (key.startsWith(KlintStorage.toCompoundKey([projectID, '']))) {
            KlintStorage.markingDatas.delete(key);
          }
        });
        KlintStorage.alterations++;
        UpdatesServer.notifyEntityUpdate(request.username, 'Project', [projectID], true);

        //  Delete all stored files for this project
        const folderPath = path.join(ProjectsRoutes.options.root, projectID);
        fs.rmdirSync(folderPath, { recursive: true });
        console.log('Removed file / folder for consistency: ' + folderPath);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }


  static setupFileRoutes() {
    //  Get list of available static files
    this.projectsRouter.get('/:id/:collectionID/files/', async (request, response) => {
      const projectID = request.params.id;
      const collectionID = request.params.collectionID;
      const folderPath = path.join(ProjectsRoutes.options.root, projectID, collectionID);
      let fileNameList: string[] = [];
      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((value) => {
          fileNameList.push(value);
        });
      }
      response.json(JSON.stringify(fileNameList));
    });


    //  Get static file
    this.projectsRouter.get('/:id/:collectionID/files/:fileName', async (request, response) => {
      const projectID = request.params.id;
      const collectionID = request.params.collectionID
      const fileNameWithExtension = decodeURIComponent(request.params.fileName);
      const filePath = path.join(ProjectsRoutes.options.root, projectID, collectionID, fileNameWithExtension);
      if (!fs.existsSync(filePath)) {
        return response.sendStatus(StatusCode.ClientErrorNotFound)
      } else {
        return response.sendFile(path.join(projectID, collectionID, fileNameWithExtension), ProjectsRoutes.options,
          (error) => {
            if (error)
              console.log('Cannot send file: ' + error);
          });
      }
    });


    //  Post static file
    this.projectsRouter.post('/:id/:collectionID/files/', async (request, response) => {
      const projectID = request.params.id;
      const collectionID = request.params.collectionID;
      const files: fileUpload.FileArray | undefined = request.files;
      const file = files?.file as fileUpload.UploadedFile;
      if (!KlintStorage.projects.has(projectID) || !KlintStorage.projectHasCollection(projectID, collectionID)) {
        return response.sendStatus(StatusCode.ClientErrorNotFound);
      }
      if (!file) {
        return response.sendStatus(StatusCode.ClientErrorBadRequest);
      } else {
        console.log(file);
        const folderPath = path.join(ProjectsRoutes.options.root, projectID, collectionID)
        const filePath = path.join(folderPath, file.name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        file.mv(filePath);
        UpdatesServer.notifyEntityUpdate(request.username, 'File', [projectID, collectionID, file.name], false);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });


    //  Delete static file
    this.projectsRouter.delete('/:id/:collectionID/files/:fileName', async (request, response) => {
      const projectID = request.params.id;
      const collectionID = request.params.collectionID;
      const fileNameWithExtension = decodeURIComponent(request.params.fileName);
      if (!projectID || !fileNameWithExtension || !collectionID || !fs.existsSync(path.join(ProjectsRoutes.options.root, projectID, collectionID, fileNameWithExtension))) {
        return response.sendStatus(StatusCode.ClientErrorNotFound)
      } else {
        fs.unlinkSync(path.join(ProjectsRoutes.options.root, projectID, collectionID, fileNameWithExtension));
        UpdatesServer.notifyEntityUpdate(request.username, 'File', [projectID, collectionID, fileNameWithExtension], true);
        return response.sendStatus(StatusCode.SuccessOK);
      }
    });
  }
}

export default ProjectsRoutes;