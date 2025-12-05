export class TextGrid {
  constructor(scene, config) {
    this.scene = scene;
    this.cols = config.cols; // 12
    this.colWidth = config.width / this.cols;
    this.rowHeight = config.rowHeight;
    this.items = [];
  }
  addItem(row, col, span, text) {
    const x = col * this.colWidth;
    const y = row * this.rowHeight;
    const w = span * this.colWidth;

    // create text with wordwrap width = w
    const txt = this.scene.add.text(x, y, text, {
      wordWrap: { width: w - 10 }, // padding
    });

    this.items.push(txt);
    return txt;
  }
  getItems() {
    return this.items;
  }
}
