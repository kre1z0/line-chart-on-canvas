class LineChart {
  constructor({ root, data }) {
    this.data = this.normalizeData(data);
    this.root = root;
    this.canvas = document.createElement("canvas");
    root.appendChild(this.canvas);
    this.init();
  }

  ticks = 5;
  width = 1000;
  height = 300;
  padding = 20;

  init() {
    const canvas = this.canvas;
    canvas.setAttribute("width", this.width);
    canvas.setAttribute("height", this.height);
    this.draw(this.data);
  }

  normalizeData(data) {
    const { columns, colors } = data;
    const { width } = this;

    const normalizedData = [];

    for (let i = 0; i < columns.length; i++) {
      const name = columns[i][0];
      const values = columns[i].slice(1);

      const obj = {
        values,
        coordinates: values.map((v, i) => ({
          x: i !== 0 ? (width / (values.length - 1)) * i : 0
        })),
        name
      };

      if (name !== "x") {
        const color = colors[name];
        normalizedData.push({
          ...obj,
          color,
          max: Math.max(...values)
        });
      } else {
        normalizedData.push(obj);
      }
    }

    return normalizedData;
  }

  onClickControlBtn(name) {
    console.info("--> onClickControlBtn ggwp", name);
  }

  setControlButton(name) {
    if (name !== "x") {
      const button = document.createElement("button");
      button.innerHTML = name;
      button.addEventListener("click", () => this.onClickControlBtn(name));
      this.root.appendChild(button);
    }
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

  draw(data) {
    const max = data.reduce(
      (prevMax, { max }) => Math.max(prevMax, max || 0),
      0
    );
    const maxLength = Math.ceil(Math.log10(max + 1));
    const roundedMax = roundUsing(max, Math.round, -maxLength + 1);
    const yScale = Array.from(
      { length: this.ticks },
      (_, index) => (roundedMax / this.ticks) * index
    );

    this.horizontalGrid(yScale);

    for (let i = 0; i < data.length; i++) {
      const { name, color } = data[i];

      this.drawLine(data[i], color, roundedMax);
      this.setControlButton(name);
    }
  }

  horizontalGrid(yScale) {
    const { width, height, ticks } = this;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");
    const array = new Array(ticks + 1);
    ctx.beginPath();

    ctx.font = "14px Tahoma serif";

    for (let i = 0; i < array.length; i++) {
      const y = i !== 0 ? height - i * (height / ticks) - 0.5 : height - 0.5;
      ctx.fillStyle = "#9CA1A6";
      ctx.fillText(yScale[i], 0, y - 8);
      ctx.strokeStyle = "#F4F4F4";
      ctx.lineWidth = 1;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }
}
