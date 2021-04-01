export default class Point {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  calculateDistance(b: Point) {
    return Math.sqrt(
      Math.pow(b.x - this.x, 2) +
        Math.pow(b.y - this.y, 2) +
        Math.pow(b.y - this.y, 2)
    );
  }
}
