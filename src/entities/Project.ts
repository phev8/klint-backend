import { Type } from "class-transformer";

enum ProjectMediaType {
  Images = 'I',
  Video = 'V'
}

enum MarkingScope {
  Tags = 'T',
  Objects = 'O',
  Segments = 'S'
}

class MarkingClass {
  classID: string = "";
  defaultTitle: string = "";
  scope: MarkingScope = MarkingScope.Objects;
  rgb: number[] = [];
}

class TagMarkingOption {
  id: string = "";
  title: string = "";
  additionalInfo: string = "";
  classIDs: string[] = [];
  isSingleChoice: boolean = false;
}

class MediaCollection {
  id: string = "";
  mediaType: ProjectMediaType = ProjectMediaType.Images;
  title: string = "";
}

class Project {
  title: string = '';

  @Type(() => MediaCollection)
  mediaCollections: MediaCollection[] = [];

  @Type(() => MarkingClass)
  classes: MarkingClass[] = [];

  @Type(() => TagMarkingOption)
  tagMarkingOptions: TagMarkingOption[] = [];
}

export { Project, MarkingClass, MarkingScope, ProjectMediaType };