import { classToPlain, deserialize, plainToClass, serialize } from 'class-transformer';
import MarkingData from '../entities/MarkingData';
import { MarkingScope, Project, ProjectMediaType } from '../entities/Project';
import User from '../entities/User';
import fs from 'fs';
import crypto from 'crypto';


type KeyValuePair = { key: string, value: unknown };

class KlintStorage {
  public static alterations: number = 0;
  public static lastSaveDuration: number = 500;
  public static projects: Map<string, Project> = new Map<string, Project>();
  public static markingDatas: Map<string, MarkingData> = new Map<string, MarkingData>();
  public static users: Map<string, User> = new Map<string, User>();
  public static projectsPath = process.env.PWD + '/storage/projects.json';
  public static markingDatasPath = process.env.PWD + '/storage/markingDatas.json';
  public static usersPath = process.env.PWD + '/storage/users.json';

  private static isWriting = false;
  private static lastSave: Date;
  private static delimiter = '|';
  private static jsonEncoding = 'utf8' as BufferEncoding;

  static toCompoundKey(strs: string[]): string {
    return strs.join(this.delimiter);
  }

  static fromCompoundKey(key: string): string[] {
    return key.split(this.delimiter);
  }

  static async reset() {
    this.projects = new Map<string, Project>();
    this.markingDatas = new Map<string, MarkingData>();
  }

  static saveToDisk() {
    if (!this.isWriting && this.alterations > 0) {
      const alterations = this.alterations;
      this.lastSave = new Date();
      const timer = new Date();
      this.isWriting = true;

      //  Somehow, manually saving a Map manually is *way* faster than restoring it at once.
      let plainMarkingDatas: any = new Object();
      KlintStorage.markingDatas.forEach((value, key) => {
        plainMarkingDatas[key] = classToPlain(value);
      });
      fs.writeFileSync(this.usersPath, serialize(KlintStorage.users), { encoding: this.jsonEncoding });
      fs.writeFileSync(this.projectsPath, serialize(KlintStorage.projects), { encoding: this.jsonEncoding });
      fs.writeFileSync(this.markingDatasPath, JSON.stringify(plainMarkingDatas), { encoding: this.jsonEncoding });

      const deltaTime = new Date().getTime() - timer.getTime();
      const bytes = fs.statSync(this.markingDatasPath).size + fs.statSync(this.projectsPath).size;
      let speed = (bytes / (1024)) / (deltaTime / 1000);
      speed = Math.round(speed);
      console.log('Saving Database took ' + deltaTime + 'ms at ' + speed + ' KB/s');
      this.alterations = this.alterations - alterations;
      this.isWriting = false;
      this.lastSaveDuration = deltaTime;
    }
  }

  static async autoSave() {
    this.saveToDisk();
    if (this.lastSaveDuration < 100) {
      this.lastSaveDuration = 100;
    }
    setTimeout(() => {
      this.autoSave();
    }, this.lastSaveDuration * 10);
  }

  static restoreFromDisk() {
    if (!this.isWriting) {
      const timer = new Date();
      this.reset();

      this.users = deserialize(Map, fs.readFileSync(this.usersPath, { encoding: this.jsonEncoding })) as Map<string, User>;
      this.projects = deserialize(Map, fs.readFileSync(this.projectsPath, { encoding: this.jsonEncoding })) as Map<string, Project>;
      //  Somehow, manually restoring Map is *way* faster than restoring it at once.
      let plainMarkingDatas = JSON.parse(fs.readFileSync(this.markingDatasPath, { encoding: this.jsonEncoding }));
      Object.keys(plainMarkingDatas).forEach(key => {
        this.markingDatas.set(key, plainToClass(MarkingData, plainMarkingDatas[key]));
      });

      const deltaTime = new Date().getTime() - timer.getTime();
      const bytes = fs.statSync(this.markingDatasPath).size + fs.statSync(this.projectsPath).size;
      let speed = (bytes / (1024)) / (deltaTime / 1000);
      speed = Math.round(speed);
      console.log('Restoring Database took ' + deltaTime + 'ms at ' + speed + ' KB/s');
    }
  }

  static async addDummyData() {
    if (KlintStorage.projects !== undefined) {
      [0].forEach(n => {
        let dummy = new Project();
        dummy.classes.push({ classID: 'tree', defaultTitle: 'Tree', scope: MarkingScope.Objects });
        dummy.classes.push({ classID: 'pedestrian', defaultTitle: 'Pedestrian', scope: MarkingScope.Objects });
        dummy.classes.push({ classID: 'car', defaultTitle: 'Car', scope: MarkingScope.Objects });

        dummy.classes.push({ classID: 'road', defaultTitle: 'Road Surface', scope: MarkingScope.Segments });
        dummy.classes.push({ classID: 'vegetation', defaultTitle: 'Vegetation', scope: MarkingScope.Segments });

        dummy.classes.push({ classID: 'camera.blurry', defaultTitle: 'Blurry', scope: MarkingScope.Tags });
        dummy.classes.push({ classID: 'camera.wrongExposure', defaultTitle: 'Under- or Overexposed', scope: MarkingScope.Tags });
        dummy.classes.push({ classID: 'camera.otherProblem', defaultTitle: 'Other Problem', scope: MarkingScope.Tags });

        dummy.classes.push({ classID: 'safety.safe', defaultTitle: 'Safe', scope: MarkingScope.Tags });
        dummy.classes.push({ classID: 'safety.somewhatUnsafe', defaultTitle: 'Somewhat Unsafe', scope: MarkingScope.Tags });
        dummy.classes.push({ classID: 'safety.unsafe', defaultTitle: 'Unsafe', scope: MarkingScope.Tags });

        dummy.tagMarkingOptions.push({ id: 'safety', title: 'Overall Safety', additionalInfo: 'Rate the percieved safety of the situation', isSingleChoice: true, classIDs: ['safety.safe', 'safety.somewhatUnsafe', 'safety.unsafe'] });
        dummy.tagMarkingOptions.push({ id: 'camera', title: 'Image Quality', additionalInfo: 'Check for image quality problems', isSingleChoice: false, classIDs: ['camera.blurry', 'camera.wrongExposure', 'safety.otherProblem'] });
        dummy.title = 'Example Project ' + n;
        dummy.mediaCollections.push({ id: 'video_collection_dummy', mediaType: ProjectMediaType.Video, title: 'Video Collection' });
        dummy.mediaCollections.push({ id: 'image_collection_dummy', mediaType: ProjectMediaType.Images, title: 'Image Collection' });
        KlintStorage.projects.set(String(n), dummy);
        for (let index = 0; index < 3; index++) {
          let markingData = new MarkingData();
          markingData.taggedClassIDs.push('safety.safe');
          markingData.boxMarkings.push({ classID: 'tree', first: [420, 420], second: [240, 240] });
          KlintStorage.markingDatas.set(this.toCompoundKey([String(n), 'image_collection_dummy', String(index) + '.jpg']), markingData);
          KlintStorage.alterations++;
        }
      });
    }
    this.createOrReplaceUser('dummy', 'dummy', 'Dummy User');
  }

  static async createOrReplaceUser(username: string, password: string, screenName: string) {
    if (username && password) {
      let user = new User();
      user.screenName = screenName;
      user.pwSalt = this.getSalt();
      user.pwHash = this.getPwHash(password, user.pwSalt);
      KlintStorage.users.set(username, user)
      KlintStorage.alterations++;
      console.log('Created new user: ' + username + ' (PW: ' + password + ')');
    }
  }


  static projectHasCollection(projectID: string, collectionID: string) {
    let project = KlintStorage.projects.get(projectID);
    let result = false;
    project?.mediaCollections.forEach(element => {
      if (element.id == collectionID) {
        result = true;
      }
    });
    return result;
  };

  static getPwHash(pw: string, salt: string) {
    return crypto.pbkdf2Sync(pw, salt, 10042, 64, 'sha512').toString('hex');
  }

  static getSalt() { return crypto.randomBytes(64).toString('hex'); }

}
export { KlintStorage, KeyValuePair };