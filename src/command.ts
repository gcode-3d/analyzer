import Point from "./point";

type data = {
  code: string;
  linenr: number;
  x: number;
  y: number;
  z: number;
  extrusionAmount: number;
  speed: number;
  lastX: number;
  lastY: number;
  lastZ: number;
};
export default class Command {
  code: string;
  linenr: number;
  currentPoint: Point;
  lastPoint: Point;
  extrusionAmount: number;
  speed: number;
  timeTaken: number = 0;
  constructor(data: data) {
    this.code = data.code;
    this.linenr = data.linenr;
    this.currentPoint = new Point(data.x, data.y, data.z);
    this.lastPoint = new Point(data.lastX, data.lastY, data.lastZ);
    this.extrusionAmount = data.extrusionAmount;
    this.speed = data.speed;
    this.timeTaken =
      this.currentPoint.calculateDistance(this.lastPoint) / (this.speed / 60);
  }
}
