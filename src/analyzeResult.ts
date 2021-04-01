export default class AnalyzeResult {
  readonly totalTimeTaken: number;
  readonly timePerLayer: Map<string, number>;
  readonly zHeightMap: Map<String, number[]>;
  constructor(
    zHeightMap: Map<String, number[]>,
    totalTimeTaken: number,
    timePerLayer: Map<string, number>
  ) {
    this.totalTimeTaken = totalTimeTaken;
    this.timePerLayer = timePerLayer;
    this.zHeightMap = zHeightMap;
  }
}
