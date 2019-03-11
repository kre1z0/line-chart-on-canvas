class LineChart {
  constructor({ root, data }) {
    this.data = data;
    this.canvas = document.createElement("canvas");
    root.appendChild(this.canvas);
    this.init();
  }

  ticks = 5;
  width = 1000;
  height = 300;
  max = 0;
  cache = {};

  init() {
    const canvas = this.canvas;
    canvas.setAttribute("width", this.width);
    canvas.setAttribute("height", this.height);
    this.horizontalGrid();
    this.drawColumns();
  }

  normalizeData(columns) {
    const { width } = this;

    const data = [];

    for (let i = 0; i < columns.length; i++) {
      const values = columns[i];
      const name = values.splice(0, 1)[0];

      if (name !== "x") {
        this.max = Math.max(this.max, ...values);
      }

      data.push({
        values,
        coordinates: values.map((v, i) => ({
          x: i !== 0 ? (width / (values.length - 1)) * i : 0
        })),
        name
      });
    }

    return data;
  }

  drawLine(data, color, max) {
    const { height } = this;
    const { name, values, coordinates } = data;
    const ctx = this.canvas.getContext("2d");

    if (name !== "x") {
      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        let { x, y } = coordinates[i];

        if (y === undefined) {
          y = height - (((values[i] * 100) / max) * height) / 100;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  drawColumns() {
    const { columns, colors } = this.data;
    const data = this.normalizeData(columns);

    for (let i = 0; i < data.length; i++) {
      const { name } = data[i];
      const color = colors[name];

      this.drawLine(data[i], color, this.max);
    }
  }

  horizontalGrid() {
    const { width, height, ticks } = this;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");
    const array = new Array(ticks + 1);
    ctx.beginPath();

    ctx.font = "14px Tahoma serif";

    for (let i = 0; i < array.length; i++) {
      const y = i !== 0 ? height - i * (height / ticks) - 0.5 : height - 0.5;
      ctx.fillStyle = "#9CA1A6";
      ctx.fillText("250", 0, y - 8);
      ctx.strokeStyle = "#F4F4F4";
      ctx.lineWidth = 1;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }
}
