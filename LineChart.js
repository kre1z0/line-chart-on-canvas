class LineChart {
  constructor({ root, data }) {
    this.data = normalizeData(data);
    this.root = root;

    this.nodes = {
      container: {
        node: document.createElement("div"),
      },
      canvas: {
        node: document.createElement("canvas"),
        height: 440,
        padding: {
          left: 20,
          right: 20,
        },
      },
      previewCanvas: {
        node: document.createElement("canvas"),
        height: 54,
        padding: {
          left: 20,
          right: 20,
        },
      },
    };

    this.classNamePrefix = "tgLineChart";
    this.init();
  }

  lineWidth = 44;
  controlBorderWidth = 5;
  startPanelGrabbing = null;
  translateX = 0;

  init() {
    const { nodes, data, lineWidth } = this;
    const {
      canvas,
      previewCanvas: { node: previewCanvas, padding },
    } = nodes;
    const { left, right } = padding;

    Object.keys(nodes).forEach((key, i, array) => {
      const { node, height } = nodes[key];

      node.classList.add(`${this.classNamePrefix}-${key}`);
      if (i > 0) {
        const { node: container } = nodes[array[0]];

        const { width } = container.getBoundingClientRect();
        node.setAttribute("width", width);
        if (height) {
          node.setAttribute("height", height);
        }
        container.appendChild(node);
      } else {
        this.root.appendChild(node);
      }
    });

    const max = getMaxValue(data);
    const { width: previewCanvasWidth } = previewCanvas.getBoundingClientRect();

    this.translateX = 444;
    this.fillPreviewCanvas(444);

    data.forEach(item => {
      if (item.type === "line") {
        // main canvas
        this.drawLine({ data: item, max, canvas, width: lineWidth });

        // preview canvas
        this.drawLine({
          data: item,
          max,
          canvas: nodes.previewCanvas,
          width: getSectionWidth(item.values, previewCanvasWidth - (left + right)),
          alpha: 0.24,
        });
      }
    });
    window.addEventListener("mousemove", this.handleMove.bind(this));
    window.addEventListener("mousedown", this.handleDown.bind(this));
    window.addEventListener("mouseup", this.handleUp.bind(this));
  }

  handleUp(e) {
    const { nodes } = this;
    const { previewCanvas } = nodes;

    this.startPanelGrabbing = null;
    document.body.style.cursor = "";

    const insidePanel = this.insidePanel(e);

    if (insidePanel) {
      previewCanvas.node.style.cursor = "grab";
    } else {
      previewCanvas.node.style.cursor = "default";
    }
  }

  handleDown(e) {
    const { previewCanvas } = this.nodes;
    const { x } = getPosition(e);

    this.startPanelGrabbing = x;

    const insidePanel = this.insidePanel(e);

    if (insidePanel) {
      document.body.style.cursor = "grabbing";
      previewCanvas.node.style.cursor = "grabbing";
    }
  }

  insidePanel(e) {
    const { x, y } = getPosition(e);
    const panelReact = this.getPanelRect();
    return isDotInsideRect([x, y], panelReact);
  }

  handleMove(e) {
    const { nodes, startPanelGrabbing } = this;
    const { previewCanvas } = nodes;

    const insidePanel = this.insidePanel(e);

    if (startPanelGrabbing === null) {
      if (insidePanel) {
        previewCanvas.node.style.cursor = "grab";
      } else {
        previewCanvas.node.style.cursor = "default";
      }
    }
  }

  getPanelRect() {
    const { translateX, controlBorderWidth, nodes } = this;
    const {
      previewCanvas: { height },
    } = nodes;

    return [translateX + controlBorderWidth, 0, translateX + 244 - controlBorderWidth, height];
  }

  drawLine({ data, max, canvas, width, alpha }) {
    const { values, color } = data;
    const { node, padding } = canvas;
    const { left = 0 } = padding;

    const { height } = node.getBoundingClientRect();
    const ctx = node.getContext("2d");

    let prevX = 0;
    let prevY = 0;

    values.forEach((value, i) => {
      ctx.beginPath();

      if (i > 0) {
        ctx.moveTo(prevX, prevY);
      }

      const x = i !== 0 ? width * i - 0.5 + left : 0 + left;
      const y = height - (((value * 100) / max) * height) / 100 - 0.5;

      if (alpha) {
        ctx.strokeStyle = hexToRGB(color, alpha);
      } else {
        ctx.strokeStyle = color;
      }

      ctx.lineWidth = 2;
      ctx.lineTo(x, y);
      ctx.stroke();
      prevX = x;
      prevY = y;
    });
  }

  fillPreviewCanvas(value) {
    const { nodes, controlBorderWidth } = this;
    const {
      previewCanvas: { node: previewCanvas, padding },
    } = nodes;
    const { left, right } = padding;

    const { width, height } = previewCanvas.getBoundingClientRect();
    const panelWidth = 244;
    const ctx = previewCanvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.fillStyle = "#F4F9FC";

    // before
    ctx.rect(left, 0, value - left, height);
    ctx.fill();

    ctx.beginPath();
    // after
    ctx.rect(value + panelWidth, 0, width - (panelWidth + value) - right, height);
    ctx.fill();

    // center
    ctx.beginPath();
    ctx.lineWidth = controlBorderWidth;
    ctx.strokeStyle = "rgba(0,0,0, 0.14)";
    ctx.rect(value + controlBorderWidth / 2, 0, panelWidth - controlBorderWidth, height);
    ctx.stroke();
  }

  destroy() {
    const {
      container: { node },
    } = this.nodes;
    node.remove();
  }
}
