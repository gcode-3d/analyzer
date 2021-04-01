import AnalysisResult from "./AnalyzeResult";
import Command from "./command";
import CommandArguments from "./commandArguments";
import Layer from "./layer";
import Point from "./point";

export default class Parser {
  readonly file: string;
  private model = new Map<string, Layer>();
  private fileArguments: CommandArguments[] = [];
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private lastF = 0;
  private lastE = 0;

  private zHeights = new Map<String, number[]>();
  private isExtrudingRelative: boolean = false;

  constructor(file: string) {
    this.file = file;
  }

  parseFile() {
    let result = this.getParsedCommands();
    this.fileArguments = result;
    result.forEach((line) => {
      switch (line.code) {
        case "G0":
        case "G1":
          this.handleLinearMove(line);
          break;

        // case "G28"
        // case "M82"
        // case "G91"
        // case "G90"
        // case "M83"
        // case "M101"
        // case "M103"
        // case "G92"
      }
    });
    let x = this.estimateLineHeight();
    console.log(x);
  }

  analyze(): AnalysisResult {
    if (!this.fileArguments) {
      this.parseFile();
    }
    let totalPrintTime = Array.from(this.model.values())
      .map((layer) => layer.totalPrintTime)
      .reduce((a, x) => a + x, 0);

    // let totalExtruded = Array.from(this.model.values())
    //   .map((layer) => layer.totalExtruded)
    //   .reduce((a, x) => a + x, 0);

    let printMap = new Map<string, number>();
    let layers: Layer[] = [];
    this.model.forEach((layer, zValue) => {
      printMap.set(zValue, layer.totalPrintTime);
      layers.push(layer);
    });
    return new AnalysisResult(layers, totalPrintTime, printMap);
  }

  private calculateDistance3D(a: Point, b: Point) {
    return Math.sqrt(
      Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2) + Math.pow(b.y - a.y, 2)
    );
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
      stringifiedZValue = argument.z.toFixed(2);
    }

    // end Z handling

    // Start extrusion handling
    if (argument.e) {
      // If the extrusion is happening in relative mode, The e argument already has the current value.
      // Otherwise just subtract the last extrustion value with the current
      if (this.isExtrudingRelative) {
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
      this.lastE = argument.e;
    }
  }
}
