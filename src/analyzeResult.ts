import Layer from "./layer";

export default class AnalyzeResult {
  readonly totalTimeTaken: number;
  readonly timePerLayer: Map<string, number>;
  readonly layers: Layer[];
  constructor(
    layers: Layer[],
    totalTimeTaken: number,
    timePerLayer: Map<string, number>
  ) {
    this.totalTimeTaken = totalTimeTaken;
    this.timePerLayer = timePerLayer;
    this.layers = layers;
  }
}
