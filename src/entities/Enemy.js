import { Pet } from "./Pet";

export class Enemy extends Pet {
  constructor(name, type, level) {
    super(name, type);
    this.level = level;
  }
}
