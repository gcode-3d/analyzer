let regexCode = /(G\d+|M\d+)/i;
let regexX = /x(([1-9]\d*|0)(\.\d+)?)/i;
let regexY = /y(([1-9]\d*|0)(\.\d+)?)/i;
let regexZ = /z(([1-9]\d*|0)(\.\d+)?)/i;
let regexE = /e(([1-9]\d*|0)(\.\d+)?)/i;
let regexF = /f(([1-9]\d*|0)(\.\d+)?)/i;

export default class CommandArguments {
  rawLine: string;
  code: string;
  isMoveCommand: boolean = true;
  lineNumber: number;
  x?: number;
  y?: number;
  z?: number;
  e?: number;
  f?: number;

  constructor(line: string, index: number) {
    this.rawLine = line;
    this.lineNumber = index;
    if (line.match(regexCode) == null) {
      throw "No code in gcode line " + line;
    }
    this.code = line.match(regexCode)[0].toUpperCase();

    if (
      !["G28", "M82", "G91", "G90", "M83", "M101", "M103", "G0", "G1"].includes(
        this.code
      )
    ) {
      this.isMoveCommand = false;
      return;
    }
    this.x =
      line.match(regexX) != null ? parseFloat(line.match(regexX)[1]) : null;
    this.y =
      line.match(regexY) != null ? parseFloat(line.match(regexY)[1]) : null;
    this.z =
      line.match(regexZ) != null ? parseFloat(line.match(regexZ)[1]) : null;
    this.e =
      line.match(regexE) != null ? parseFloat(line.match(regexE)[1]) : null;
    this.f =
      line.match(regexF) != null ? parseFloat(line.match(regexF)[1]) : null;
  }
}
