import Command from "./command";

export default class Layer {
  commands: Command[] = [];
  totalPrintTime = 0;
  totalExtruded = 0;
  constructor(commands?: Command[]) {
    if (commands) {
      this.commands = commands;
      this.calculateTotals();
    }
  }
  addCommand(command: Command) {
    this.commands.push(command);
    this.calculateTotals();
  }

  calculateTotals() {
    this.totalPrintTime = this.commands
      .map((i) => i.timeTaken)
      .reduce((a, x) => a + x, 0);

    this.totalExtruded = this.commands
      .map((i) => i.extrusionAmount)
      .reduce((a, x) => a + x, 0);
  }
}
