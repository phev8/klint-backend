import { classToPlain, deserialize, plainToClass, serialize } from 'class-transformer';
import MarkingData from '../entities/MarkingData';
import { MarkingScope, Project } from '../entities/Project';
import fs from 'fs';


type KeyValuePair = { key: string, value: unknown };

class KlintStorage {
  public static projects: Map<string, Project> = new Map<string, Project>();
  public static markingDatas: Map<string, MarkingData> = new Map<string, MarkingData>();

  private static isWriting = false;
  private static lastSave: Date;
  private static projectsPath = process.env.PWD + '/storage/projects.json';
  private static markingDatasPath = process.env.PWD + '/storage/markingDatas.json';
  private static delimiter = '|';
  private static jsonEncoding = 'utf8' as BufferEncoding;

  static toCompoundKey(a: string, b: string): string {
    return '' + a + this.delimiter + b;
  }

  static async reset() {
    this.projects = new Map<string, Project>();
    this.markingDatas = new Map<string, MarkingData>();
  }

  static saveToDisk() {
    if (!this.isWriting) {
      this.lastSave = new Date();
      const timer = new Date();
      this.isWriting = true;
      let plainMarkingDatas: any = new Object();
      KlintStorage.markingDatas.forEach((value, key) => {
        plainMarkingDatas[key] = classToPlain(value);
      });
      fs.writeFileSync(this.projectsPath, serialize(KlintStorage.projects), { encoding: this.jsonEncoding });
      fs.writeFileSync(this.markingDatasPath, JSON.stringify(plainMarkingDatas), { encoding: this.jsonEncoding });
      const deltaTime = new Date().getTime() - timer.getTime();
      const bytes = fs.statSync(this.markingDatasPath).size + fs.statSync(this.projectsPath).size;
      let speed = (bytes / (1024)) / (deltaTime / 1000);
      speed = Math.round(speed);
      console.log('Saving Database took ' + deltaTime + 'ms at ' + speed + ' KB/s');
      this.isWriting = false;
    }
  }

  static restoreFromDisk() {
    if (!this.isWriting) {
      const timer = new Date();
      this.reset();
      this.projects = deserialize(Map, fs.readFileSync(this.projectsPath, { encoding: this.jsonEncoding })) as Map<string, Project>;
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
      let dummy = new Project();
      dummy.imagesFolderPath = '/important/files';
      dummy.classes.push({ classID: 'tree', defaultTitle: 'Tree', scope: MarkingScope.Objects });
      dummy.classes.push({ classID: 'hasTrees', defaultTitle: 'Contains Tree(s)', scope: MarkingScope.Tags });
      [0].forEach(n => {
        dummy.title = 'Important Project ' + n;
        KlintStorage.projects.set(String(n), dummy);
        for (let index = 0; index < 10000; index++) {
          let markingData = new MarkingData();
          markingData.taggedClassIDs.push('hasTrees');
          markingData.boxMarkings.push({ classID: 'tree', first: [42, 42], second: [24, 24] });
          KlintStorage.markingDatas.set(this.toCompoundKey(String(n), String(index)), markingData);
        }
      });
    }
  }


}
export { KlintStorage, KeyValuePair };