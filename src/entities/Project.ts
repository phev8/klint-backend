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
  scope: MarkingScope,
  argb: number[]
}

type TagMarkingOption = {
  id: string,
  title: string,
  additionalInfo: string,
  classIDs: string[],
  isSingleChoice: boolean
}

type MediaCollection = {
  id: string,
  mediaType: ProjectMediaType,
  title: string
}

class Project {
  title: string = '';
  mediaCollections: MediaCollection[] = [];
  classes: MarkingClass[] = [];
  tagMarkingOptions: TagMarkingOption[] = [];
}

export { Project, MarkingClass, MarkingScope, ProjectMediaType };