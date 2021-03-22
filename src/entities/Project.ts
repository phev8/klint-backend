enum ProjectMediaType {
  Images = 'I',
  Video = 'V'
}

enum MarkingScope {
  Tags = 'T',
  Objects = 'O',
  Segments = 'S'
}

type MarkingClass = {
  classID: string,
  defaultTitle: string,
  scope: MarkingScope
}

type TagMarkingOption = {
  id: string,
  title: string,
  additionalInfo: string,
  classIDs: string[],
  isSingleChoice: boolean
}

class Project {
  title: string = '';
  mediaType: ProjectMediaType = ProjectMediaType.Video;
  videoPath: string = '';
  imagesFolderPath: string = '';
  classes: MarkingClass[] = [];
  tagMarkingOptions: TagMarkingOption[] = [];
}

export { Project, MarkingClass, MarkingScope };