import { deserialize, plainToClass } from 'class-transformer';
import fs from 'fs';
import path from 'path';
import { KlintStorage } from './src/classes/KlintStorage';
import { Project } from './src/entities/Project';
import ProjectsRoutes from './src/routes/projects.routes';

type CollectionData = { collectionId: string, path: string };
type UserData = { username: string, password: string, screenName: string };

type ConfigJSON = {
  projectId: string,
  projectData: Project,
  collectionData: CollectionData[],
  users: UserData[]
};

let pathToConfigJSON = process.argv[3];
let reset = false;
let move = false;
let jsonEncoding = 'utf8' as BufferEncoding;

if (process.argv.includes('reset')) {
  reset = true
}

if (process.argv.includes('move')) {
  move = true
}


const replaceProjectData = () => {
  // Locate config JSON and load as any object
  let configJSONObject: any = {};
  try {
    console.log('Importing from: ' + pathToConfigJSON);
    configJSONObject = JSON.parse(fs.readFileSync(pathToConfigJSON, { encoding: jsonEncoding }))
    configJSONObject.projectData = plainToClass(Project, configJSONObject.projectData);
    configJSONObject = configJSONObject as ConfigJSON;
  } catch (error) {
    console.log('Cannot decode config file: ' + error);
  }

  let configJSON = configJSONObject as ConfigJSON;

  //Checking projectId
  if (!configJSON.projectId) {
    console.log('projectId must not be null or undefined.');
  }

  // Checking media collections
  configJSON.collectionData.forEach(element => {
    if (!fs.statSync(element.path).isDirectory()) {
      console.log('Could not locate media collection: ' + element.path);
      return;
    }
  });

  // Loading database
  console.log('Loading current database state...');
  if (fs.existsSync(KlintStorage.projectsPath)) {
    try {
      KlintStorage.restoreFromDisk();
    } catch (error) {
      console.log(error);
    }
  }

  //  Reset database if specified
  if (reset) {
    console.log('Resetting database...');
    KlintStorage.reset();
  }

  // Inserting Project
  console.log('Inserting Project...');
  KlintStorage.projects.set(configJSON.projectId, configJSON.projectData as Project);

  // Inserting Users
  console.log('Inserting Users...');
  configJSON.users.forEach(user => {
    KlintStorage.createOrReplaceUser(user.username, user.password, user.screenName);
  });

  // Copy files
  console.log('Transfering Media...');
  configJSON.collectionData.forEach(collection => {
    if (collection.collectionId) {
      const folderPath = path.join(path.join(__dirname, '/storage/projectFiles'), configJSON.projectId, collection.collectionId);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      } else {
        fs.rmdirSync(folderPath, { recursive: true });
        fs.mkdirSync(folderPath, { recursive: true });
      }
      let filePaths = fs.readdirSync(collection.path);
      console.log('Files located: ' + filePaths.length);
      filePaths = filePaths.map(
        (fileName) => {
          return path.join(collection.path, fileName)
        });
      try {
        filePaths.forEach(file => {
          if (fs.statSync(file).isFile()) {
            if (move) {
              // Move files
              fs.renameSync(file, path.join(folderPath, path.basename(file)));
            } else {
              // Copy files
              fs.copyFileSync(file, path.join(folderPath, path.basename(file)));
            }
          }
        });
      } catch (error) {
        console.log('Could not transfer collection files: ' + error);
      }
    } else {
      console.log('Collection Id must not be null or undefined.');
      return;
    }
  });

  // Save and Exit
  KlintStorage.saveToDisk();
}

replaceProjectData();
