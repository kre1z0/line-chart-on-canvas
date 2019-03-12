class LineChart {
  constructor({ root, data }) {
    this.data = data;
    this.root = root;
    this.canvas = document.createElement("canvas");
    this.previewCanvas = document.createElement("canvas");
    this.container = document.createElement("div");
    this.previewControl = document.createElement("div");
    this.onControl = this.onControl.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onPanelTransform = this.onPanelTransform.bind(this);
    this.init();
  }

  ticks = 5;
  yScaleHeight = 40;
  width = 0;
  sectionWidth = 44;
  height = 440;
  previewPanelHeight = 54;
  previewPanelWidth = 0;
  containerWidth = 0;
  capture = [0, 0];
  controlBorderWidth = 5;
  start = 0;
  translateX = 0;

  init() {
    this.data = this.normalizeData(this.data);

    const canvas = this.canvas;
    const container = this.container;
    container.classList.add("line-chart-container");
    this.root.appendChild(container);
    this.container.appendChild(canvas);
    this.containerWidth = this.container.getBoundingClientRect().width;

    const totalSections = this.data[0].values.length - 2;
    const optimalSectionWidth = this.containerWidth / totalSections;
    const maxSectionWidth = Math.floor(Math.max(optimalSectionWidth, this.sectionWidth));
    const sections = Math.floor(this.containerWidth / maxSectionWidth);
    const remainder = this.containerWidth % maxSectionWidth;

    this.sectionWidth = maxSectionWidth + remainder / sections;
    this.width = totalSections * this.sectionWidth;
    const previewCanvas = this.previewCanvas;
    const previewPanelContainer = document.createElement("div");
    previewPanelContainer.classList.add("preview-container");
    previewPanelContainer.appendChild(previewCanvas);
    this.container.appendChild(previewPanelContainer);

    this.previewPanelWidth = (this.containerWidth / totalSections) * sections;
    const previewControl = this.previewControl;
    previewControl.style.borderLeftWidth = this.controlBorderWidth + "px";
    previewControl.style.borderRightWidth = this.controlBorderWidth + "px";
    previewControl.style.width = this.previewPanelWidth + "px";
    previewControl.style.height = this.previewPanelHeight + "px";
    previewControl.addEventListener("mousedown", this.onControl);
    previewControl.classList.add("preview-control");
    previewPanelContainer.appendChild(previewControl);

    const xCanvas = (totalSections - sections) * this.sectionWidth;
    const xPreviewPanel = this.containerWidth - this.previewPanelWidth;
    this.translateX = xPreviewPanel;
    this.canvas.style.transform = `translateX(-${xCanvas}px)`;
    this.previewControl.style.transform = `translateX(${xPreviewPanel}px)`;
    this.capture = [totalSections - sections, totalSections];

    canvas.setAttribute("width", this.width);
    canvas.setAttribute("height", this.height + this.yScaleHeight);

    previewCanvas.setAttribute("width", this.containerWidth);
    previewCanvas.setAttribute("height", this.previewPanelHeight);

    this.draw(this.data);
  }

  onControl(e) {
    if (e.offsetX < 0) {
      console.info("start left");
    } else if (e.offsetX + this.controlBorderWidth >= Math.round(this.previewPanelWidth - this.controlBorderWidth)) {
      console.info("start right");
    } else {
      this.start = getPositionX(e);
      window.addEventListener("mousemove", this.onPanelTransform);
      window.addEventListener("mouseup", this.onMouseUp);
      console.info("start center");
    }
  }

  onPanelTransform(e) {
    const { previewControl, translateX } = this;
    const positionX = getPositionX(e) - this.start;

    previewControl.style.transform = `translateX(${translateX + positionX}px)`;
  }

  onMouseUp(e) {
    const positionX = getPositionX(e) - this.start;
    this.translateX = this.translateX + positionX;
    this.start = 0;

    window.removeEventListener("mousemove", this.onPanelTransform);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  normalizeData(data) {
    const { columns, colors } = data;

    const normalizedData = [];

    for (let i = 0; i < columns.length; i++) {
      const name = columns[i][0];
      const values = columns[i].slice(1);

      const obj = {
        values,
        name,
      };

      if (name !== "x") {
        const color = colors[name];
        normalizedData.push({
          ...obj,
          color,
          max: Math.max(...values),
        });
      } else {
        const labels = values.map(v => {
          const datetime = new Date(v);
          const date = datetime.getDate();
          const month = datetime.toLocaleString("en-us", {
            month: "short",
          });
          return `${date} ${month}`;
        });

        normalizedData.push({ ...obj, labels });
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
      this.container.appendChild(button);
    }
  }

  drawLine(data, color, max) {
    const { height, yScaleHeight } = this;
    const { name, values, labels } = data;
    const ctx = this.canvas.getContext("2d");
    const ctxP = this.previewCanvas.getContext("2d");
    ctx.beginPath();

    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < values.length; i++) {
      const x = i !== 0 ? this.sectionWidth * i : 0;
      if (name !== "x") {
        const y = height - (((values[i] * 100) / max) * height) / 100 - 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineTo(x, y);

        const pX = i !== 0 ? (this.containerWidth / (values.length - 2)) * i : 0;
        const pY = this.previewPanelHeight - (((values[i] * 100) / max) * this.previewPanelHeight) / 100 - 0.5;

        ctxP.beginPath();
        ctxP.strokeStyle = color;

        const [start, end] = this.capture;
        if (i <= start || i > end) {
          ctxP.strokeStyle = hexToRGB(color, 0.2);
        }

        ctxP.lineWidth = 2;

        if (i > 0) {
          ctxP.moveTo(prevX, prevY);
        }

        ctxP.lineTo(pX, pY);
        ctxP.stroke();
        prevX = pX;
        prevY = pY;
      } else {
        if (i % 2 === 0 || this.sectionWidth > 88) {
          ctx.fillText(labels[i], x, height + yScaleHeight / 2);
        }
      }
    }

    ctx.stroke();
  }

  fillPreviewCanvas() {
    const { containerWidth, data, previewCanvas, previewPanelHeight, capture } = this;

    const totalPaths = data[0].values.length - 2;
    const remainder = containerWidth % totalPaths;
    const pathWidth = Math.floor(containerWidth / totalPaths) + remainder / totalPaths;

    const [start, end] = capture;
    const ctxP = previewCanvas.getContext("2d");

    ctxP.beginPath();
    ctxP.fillStyle = "#F4F9FC";
    if (start > 0) {
      ctxP.rect(0, 0, pathWidth * start, previewPanelHeight);
      ctxP.fill();
    }

    if (end < totalPaths) {
      const x = end * pathWidth;
      const width = (totalPaths - end) * pathWidth;
      ctxP.rect(x, 0, width, previewPanelHeight);
      ctxP.fill();
    }
  }

  draw(data) {
    const max = data.reduce((prevMax, { max }) => Math.max(prevMax, max || 0), 0);
    const maxLength = Math.ceil(Math.log10(max + 1));
    const roundedMax = roundUsing(max, Math.ceil, -maxLength + 2);

    const yScale = Array.from({ length: this.ticks }, (_, index) => (roundedMax / this.ticks) * index);

    this.horizontalGrid(yScale);

    this.fillPreviewCanvas();

    for (let i = 0; i < data.length; i++) {
      const { name, color } = data[i];

      this.drawLine(data[i], color, roundedMax);
      this.setControlButton(name);
    }
  }

  horizontalGrid(yScale) {
    const { width, height, ticks } = this;
    const ctx = this.canvas.getContext("2d");
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
