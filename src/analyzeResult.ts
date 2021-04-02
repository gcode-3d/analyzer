export default class AnalyzeResult {
  readonly totalTimeTaken: number;
  readonly timePerLayer: Map<string, number>;
  readonly layerBeginEndMap: Map<
    string,
    { beginLineNr: number; endLineNr: number }
  >;

  constructor(
    layerBeginEndMap: Map<string, { beginLineNr: number; endLineNr: number }>,
    totalTimeTaken: number,
    timePerLayer: Map<string, number>
  ) {
    this.totalTimeTaken = totalTimeTaken;
    this.timePerLayer = timePerLayer;
    this.layerBeginEndMap = layerBeginEndMap;
  }
}
