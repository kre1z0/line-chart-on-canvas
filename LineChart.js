class LineChart {
  constructor({ root, data, offset }) {
    this.data = normalizeData(data);
    this.root = root;
    this.offset = { left: 20, right: 20, ...offset };
    this.nodes = {
      container: {
        node: document.createElement("div"),
      },
      canvas: {
        node: document.createElement("canvas"),
        height: 440,
      },
      previewCanvas: {
        backNode: document.createElement("canvas"),
        node: document.createElement("canvas"),
        panelCanvas: document.createElement("canvas"),
        height: 54,
      },
    };

    this.controlBorderWidth = 5;
    this.startPanelGrabbing = null;
    this.panelX = 0;
    this.panelW = 0;
    this.maxValue = 0;
    this.lineLengthPreviewCanvas = 0;
    this.lineLength = window.innerWidth / (getDataMaxLength(this.data) / 4);
    this.classNamePrefix = "tgLineChart";
    this.init();
  }

  init() {
    const { nodes, data, lineLength, offset } = this;
    const {
      canvas,
      previewCanvas: { node: previewCanvas, backNode },
    } = nodes;
    const { left, right } = offset;

    Object.keys(nodes).forEach((key, i, array) => {
      const { node, height, backNode } = nodes[key];

      node.classList.add(`${this.classNamePrefix}-${key}`);
      if (i > 0) {
        const { node: container } = nodes[array[0]];

        const { width } = container.getBoundingClientRect();
        node.setAttribute("width", width);
        if (height) {
          node.setAttribute("height", height);
        }

        if (backNode) {
          backNode.setAttribute("width", width);
          backNode.setAttribute("height", height);
        }

        container.appendChild(node);
      } else {
        this.root.appendChild(node);
      }
    });

    this.maxValue = getMaxValue(data);
    const previewCanvasWidth = previewCanvas.getBoundingClientRect().width - left - right;

    this.panelW = this.getPanelWidthFromLineLength();
    this.panelX = previewCanvasWidth - this.panelW;

    this.lineLengthPreviewCanvas = getLineLength(data, previewCanvasWidth);

    data.forEach(item => {
      if (item.type === "line") {
        // main canvas
        this.drawLine({ data: item, maxValue: this.maxValue, canvas, lineLength });

        // preview canvas
        this.drawLine({
          data: item,
          maxValue: this.maxValue,
          canvas: nodes.previewCanvas,
          lineLength: this.lineLengthPreviewCanvas,
        });
        this.initControl(item);
      }
    });

    const backCtx = backNode.getContext("2d");
    backCtx.drawImage(previewCanvas, 0, 0);

    this.fillPreviewCanvas(previewCanvasWidth - this.panelW, this.panelW);
    this.setListeners();
  }

  initControl({ name, color }) {
    const { nodes } = this;
    const { container } = nodes;
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.innerText = `graph ${name}`;
    const icon = document.createElement("div");
    icon.classList.add(`${this.classNamePrefix}-checkmark-icon`);
    icon.style.backgroundColor = color;
    icon.style.borderColor = color;
    label.classList.add(`${this.classNamePrefix}-control`);
    const input = document.createElement("input");
    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(text);
    input.setAttribute("type", "checkbox");
    input.setAttribute("checked", "checked");
    container.node.appendChild(label);
  }

  setListeners() {
    document.addEventListener("mousemove", this.handleMove.bind(this));
    document.addEventListener("touchmove", this.handleMove.bind(this));
    document.addEventListener("mousedown", this.handleDown.bind(this));
    document.addEventListener("touchstart", this.handleDown.bind(this));
    document.addEventListener("mouseup", this.handleUp.bind(this));
    document.addEventListener("touchend", this.handleUp.bind(this));
  }

  clearCanvas(canvas) {
    const { width, height } = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
  }

  drawLine({ data, maxValue, canvas, lineLength }) {
    const { offset } = this;
    const { values, color } = data;
    const { node } = canvas;
    const { left } = offset;

    const { height } = node.getBoundingClientRect();
    const ctx = node.getContext("2d");

    let prevX = 0;
    let prevY = 0;

    values.forEach((value, i) => {
      const x = i !== 0 ? lineLength * i - 0.5 + left : 0 + left;
      const y = height - (((value * 100) / maxValue) * height) / 100 - 0.5;

      ctx.beginPath();
      // ctx.arc(x, y, 44, 0, 4);
      if (i > 0) {
        ctx.moveTo(prevX + 0, prevY);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineTo(x, y);
      ctx.stroke();

      prevX = x;
      prevY = y;
    });
  }

  getPanelWidthFromLineLength() {
    const { nodes, data, lineLength, offset } = this;
    const { left, right } = offset;
    const { canvas, previewCanvas } = nodes;

    const previewCanvasWidth = previewCanvas.node.getBoundingClientRect().width - left - right;
    const canvasWidth = canvas.node.getBoundingClientRect().width - left - right;
    const lineLengthPreviewCanvas = getLineLength(data, previewCanvasWidth);

    const panelWidth = (canvasWidth / lineLength) * lineLengthPreviewCanvas;

    return panelWidth;
  }

  getPanelRect() {
    const { panelX, panelW, controlBorderWidth, nodes, offset } = this;
    const {
      previewCanvas: { height },
    } = nodes;
    const { left, right } = offset;

    return [
      panelX + controlBorderWidth + left,
      0,
      panelX + panelW - controlBorderWidth + right,
      height,
    ];
  }

  handleMove(e) {
    const { nodes, startPanelGrabbing, panelW, offset } = this;
    const { previewCanvas } = nodes;
    const { left, right } = offset;

    const { move, leftBorder, rightBorder } = this.insidePanel(e);

    if (startPanelGrabbing === null) {
      if (move) {
        previewCanvas.node.style.cursor = "grab";
      } else if (leftBorder || rightBorder) {
        previewCanvas.node.style.cursor = "col-resize";
      } else {
        previewCanvas.node.style.cursor = "default";
      }
    } else if (isNumeric(startPanelGrabbing)) {
      const { width } = previewCanvas.node.getBoundingClientRect();
      const { x } = getPosition(e);
      const positionX = x - startPanelGrabbing;
      const nextX = rateLimit(this.panelX + positionX, 0, width - panelW - left - right);

      this.clearCanvas(previewCanvas.node);
      const ctx = previewCanvas.node.getContext("2d");
      ctx.drawImage(previewCanvas.backNode, 0, 0);
      this.fillPreviewCanvas(nextX, this.panelW);
    }
  }

  handleUp(e) {
    const { nodes, startPanelGrabbing, panelX, offset } = this;
    const { previewCanvas } = nodes;
    const { left, right } = offset;
    const { x } = getPosition(e);
    const { width } = previewCanvas.node.getBoundingClientRect();

    if (isNumeric(startPanelGrabbing)) {
      const positionX = x - startPanelGrabbing;
      this.panelX = rateLimit(panelX + positionX, 0, width - this.panelW - left - right);

      this.startPanelGrabbing = null;
      document.documentElement.style.cursor = "";
    }

    const { move, leftBorder, rightBorder } = this.insidePanel(e);

    if (move) {
      previewCanvas.node.style.cursor = "grab";
    } else if (leftBorder || rightBorder) {
      previewCanvas.node.style.cursor = "col-resize";
    } else {
      previewCanvas.node.style.cursor = "default";
    }
  }

  handleDown(e) {
    const { previewCanvas } = this.nodes;
    const { x } = getPosition(e);
    const { move, leftBorder, rightBorder } = this.insidePanel(e);

    if (move) {
      this.startPanelGrabbing = x;
      document.documentElement.style.cursor = "grabbing";
      previewCanvas.node.style.cursor = "grabbing";
    } else if (leftBorder || rightBorder) {
      document.documentElement.style.cursor = "col-resize";
    }
  }

  insidePanel(e) {
    const { controlBorderWidth } = this;
    const { x, y } = getPosition(e);
    const panelReact = this.getPanelRect();
    const [xMin, yMin, xMax, yMax] = panelReact;

    const leftBorderRect = [xMin - controlBorderWidth, yMin, xMin + controlBorderWidth, yMax];
    const rightBorderRect = [xMax, yMin, xMax + controlBorderWidth, yMax];

    return {
      leftBorder: isDotInsideRect([x, y], leftBorderRect),
      rightBorder: isDotInsideRect([x, y], rightBorderRect),
      move: isDotInsideRect([x, y], panelReact),
    };
  }

  fillPreviewCanvas(x, panelWidth) {
    const { nodes, controlBorderWidth, offset } = this;
    const {
      previewCanvas: { node: previewCanvas },
    } = nodes;
    const { left, right } = offset;

    const { width, height } = previewCanvas.getBoundingClientRect();
    const ctx = previewCanvas.getContext("2d");

    ctx.beginPath();
    ctx.fillStyle = hexToRGB("#F4F9FC", 0.76);

    // before
    ctx.rect(left, 0, x, height);
    ctx.fill();

    ctx.beginPath();
    // after
    ctx.rect(x + panelWidth + left, 0, width - left - right - x - panelWidth, height);
    ctx.fill();

    // center
    ctx.beginPath();
    ctx.lineWidth = controlBorderWidth;
    ctx.strokeStyle = "rgba(0,0,0, 0.14)";
    ctx.rect(x + left + controlBorderWidth / 2, 0, panelWidth - controlBorderWidth, height);
    ctx.stroke();
  }

  destroy() {
    const {
      container: { node },
    } = this.nodes;
    node.remove();
  }
}
