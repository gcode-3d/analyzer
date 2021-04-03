import AnalysisResult from "./analyzeResult";
import Command from "./command";
import CommandArguments from "./commandArguments";
import Layer from "./layer";

export { AnalysisResult };

export default class Parser {
  readonly file: string;
  private model = new Map<string, Layer>();
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private lastF = 0;
  private lastE = 0;

  private isExtrudingRelative: boolean = false;
  private isAllRelative: boolean = false;
  private zHeights = new Map<string, number[]>();

  constructor(file: string) {
    this.file = file;
    this.parseFile();
  }

  private parseFile() {
    let result = this.getParsedCommands();
    result.forEach((line) => {
      switch (line.code) {
        case "G0":
        case "G1":
          this.handleLinearMove(line);
          break;

        case "G28":
          this.handleLevelingRoutine(line);
          break;
        case "G91":
          this.isAllRelative = true;
          this.isExtrudingRelative = false;
          break;
        case "G90":
          this.isAllRelative = false;
          this.isExtrudingRelative = false;
          break;
        case "M82":
          this.isExtrudingRelative = false;
          break;
        case "M83":
          this.isExtrudingRelative = true;
          break;
        case "G92":
          this.handleSetPosition(line);
          break;
      }
    });
  }

  analyze(): AnalysisResult {
    let totalPrintTime = Array.from(this.model.values())
      .map((layer) => layer.totalPrintTime)
      .reduce((a, x) => a + x, 0);

    // let totalExtruded = Array.from(this.model.values())
    //   .map((layer) => layer.totalExtruded)
    //   .reduce((a, x) => a + x, 0);

    let printMap = new Map<string, number>();
    this.model.forEach((layer, zValue) => {
      printMap.set(zValue, layer.totalPrintTime);
    });
    let layerBeginEndMap: Map<
      string,
      { beginLineNr: number; endLineNr: number }
    > = new Map();
    this.zHeights.forEach((value, key) => {
      let sorted = value.sort((a, b) => (a > b ? 1 : -1));
      layerBeginEndMap.set(key, {
        beginLineNr: sorted[0],
        endLineNr: sorted[sorted.length - 1],
      });
    });
    return new AnalysisResult(layerBeginEndMap, totalPrintTime, printMap);
  }

  private estimateLineHeight(): string {
    let lastValue = 0;
    let differences = new Map<string, number>();
    Array.from(this.model)
      .sort((a, b) => {
        if (parseFloat(a[0]) > parseFloat(b[0])) {
          return 1;
        } else if (parseFloat(a[0]) < parseFloat(b[0])) {
          return -1;
        }
        return 0;
      })
      .map((layer) => {
        let key = layer[0];
        let value = layer[1];
        let newLayer = new Layer(
          value.commands.filter((i) => i.code.toUpperCase() === "G1")
        );
        return [key, newLayer];
      })
      .forEach((layer) => {
        let key = layer[0] as string;
        let value = layer[1] as Layer;
        let parsedKey = parseFloat(key);
        let difference = (parsedKey - lastValue).toFixed(4);
        if (value.commands.length == 0) {
          return;
        }
        if (differences.has(difference)) {
          let currentDiff = differences.get(difference);
          currentDiff += value.commands.length;
          differences.set(difference, currentDiff);
        } else {
          differences.set(difference, value.commands.length);
        }

        lastValue = parsedKey;
      });

    if (differences.size == 0) {
      return null;
    }

    return Array.from(differences).sort((a, b) => {
      if (a[1] < b[1]) {
        return 1;
      } else if (a[1] > b[1]) {
        return -1;
      }
      return 0;
    })[0][0];
  }

  private getParsedCommands(): CommandArguments[] {
    return this.file
      .split(/\r\n?|\n/)
      .map((line) => line.replace(/;.*$/, "").trim())
      .filter((line) => line.length !== 0)
      .map(
        (line, index) =>
          new CommandArguments(line.trim().replace(/;.*$/, ""), index)
      );
  }

  private handleLinearMove(argument: CommandArguments) {
    let currentExtrusion = 0;

    // Start Z handling:
    // If Z value is present, parse to string (2 digits) and store layernumber, otherwise just add layernumber to last Z value.
    let stringifiedZValue: string;
    if (!argument.z) {
      stringifiedZValue = this.lastZ.toFixed(2);
    } else {
      if (argument.z && this.isAllRelative) {
        argument.z = this.lastZ + argument.z;
      }

      stringifiedZValue = argument.z.toFixed(2);
    }
    if (argument.e) {
      if (this.zHeights.has(stringifiedZValue)) {
        let current = this.zHeights.get(stringifiedZValue);
        current.push(argument.lineNumber);
        this.zHeights.set(stringifiedZValue, current);
      } else {
        this.zHeights.set(stringifiedZValue, [argument.lineNumber]);
      }
    }
    // end Z handling

    // Start extrusion handling
    if (argument.e) {
      // If the extrusion is happening in relative mode, The e argument already has the current value.
      // Otherwise just subtract the last extrusion value with the current
      if (this.isExtrudingRelative || this.isAllRelative) {
        currentExtrusion = argument.e;
      } else {
        currentExtrusion = argument.e - this.lastE;
      }
    }
    // End extrusion handling

    // Start feedrate handling

    if (argument.f) {
      this.lastF = argument.f;
    }
    // end feedrate handling

    // Check if x & y are specified, or set them to lastX/Y when not set. If Extruding relatively, make the x/y the specified x/y and add lastx/Y
    if (argument.x) {
      if (this.isAllRelative) {
        argument.x = this.lastX + argument.x;
      }
    } else {
      argument.x = this.lastX;
    }
    if (argument.y) {
      if (this.isAllRelative) {
        argument.y = this.lastY + argument.y;
      }
    } else {
      argument.y = this.lastY;
    }

    let command = new Command({
      code: argument.code,
      x: argument.x ? argument.x : this.lastX,
      y: argument.y ? argument.y : this.lastY,
      z: argument.z ? argument.z : this.lastZ,
      lastX: this.lastX,
      lastY: this.lastY,
      lastZ: this.lastZ,
      linenr: argument.lineNumber,
      speed: this.lastF,
      extrusionAmount: currentExtrusion,
    });

    if (this.model.has(stringifiedZValue)) {
      this.model.get(stringifiedZValue).addCommand(command);
    } else {
      let layer = new Layer();
      layer.addCommand(command);
      this.model.set(stringifiedZValue, layer);
    }

    if (argument.x) {
      this.lastX = argument.x;
    }
    if (argument.y) {
      this.lastY = argument.y;
    }
    if (argument.z) {
      this.lastZ = argument.z;
    }
    if (argument.e) {
      if (this.isAllRelative || this.isExtrudingRelative) {
        this.lastE += argument.e;
      }
    }
  }

  handleLevelingRoutine(line: CommandArguments) {
    let flagX = line.rawLine.toLowerCase().includes("x");
    let flagY = line.rawLine.toLowerCase().includes("y");
    let flagZ = line.rawLine.toLowerCase().includes("z");
    if (flagX) {
      line.x = 0;
    }
    if (flagY) {
      line.y = 0;
    }
    if (flagZ) {
      line.z = 0;
    }
    if (!flagX && !flagY && !flagZ) {
      line.x = 0;
      line.y = 0;
      line.z = 0;
    }
    new Command({
      code: "G28",
      linenr: line.lineNumber,
      x: line.x,
      y: line.y,
      z: line.z,
      extrusionAmount: 0,
      speed: this.lastF,
      lastX: this.lastX,
      lastY: this.lastY,
      lastZ: this.lastZ,
    });
    this.lastX = line.x;
    this.lastY = line.y;
    this.lastZ = line.z;
  }
  handleSetPosition(line: CommandArguments) {
    if (!line.x) {
      line.x = this.lastX;
    }
    if (!line.y) {
      line.y = this.lastY;
    }
    if (!line.z) {
      line.z = this.lastZ;
    }
    if (!line.e) {
      line.e = this.lastE;
    }
    new Command({
      code: "G92",
      linenr: line.lineNumber,
      x: line.x,
      y: line.y,
      z: line.z,
      extrusionAmount: 0,
      speed: this.lastF,
      lastX: this.lastX,
      lastY: this.lastY,
      lastZ: this.lastZ,
    });
    this.lastX = line.x;
    this.lastY = line.y;
    this.lastZ = line.z;
    this.lastE = line.e;
  }
}
