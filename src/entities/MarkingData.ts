type BoxMarking = {
  classID: string;
  first: [number, number];
  second: [number, number];
}

class MarkingData {
  taggedClassIDs: string[] = [];
  boxMarkings: BoxMarking[] = [];
}
export default MarkingData;