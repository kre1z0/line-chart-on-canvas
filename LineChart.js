"use asm";

class LineChart {
  constructor({ root, data, offset, header }) {
    const devicePixelRatio = window.devicePixelRatio || 1;

    this.data = data;
    this.root = root;
    this.header = header;
    this.offset = { left: 20, right: 20, bottom: 44, ...offset };
    this.nodes = {
      container: {
        node: document.createElement("div"),
      },
      canvas: {
        node: document.createElement("canvas"),
        backNode: document.createElement("canvas"),
        height: 400,
        lineWidth: 3 * devicePixelRatio,
        gridLineColor: "#f1f1f1",
      },
      previewCanvas: {
        backNode: document.createElement("canvas"),
        node: document.createElement("canvas"),
        height: 54,
        lineWidth: 1 * devicePixelRatio,
      },
    };

    this.controlBorderWidth = 5 * devicePixelRatio;
    this.startPanelGrabbing = null;
    this.startPanelResize = null;
    this.panelX = 0;
    this.panelW = 0;
    this.maxValue = 0;
    this.lineLengthPreviewCanvas = 0;
    this.lineLength =
      (window.innerWidth / (getDataMaxLength(this.data) - 1)) * devicePixelRatio * 4;
    this.classNamePrefix = "tgLineChart";
    this.disabledLines = [];
    this.devicePixelRatio = devicePixelRatio;
    this.labelsIsDrawn = false;
    this.selectedItem = null;
    this.init();
  }

  init() {
    this.appendNodes();
    this.resizeNodes();
    this.draw();
    this.setListeners();
  }

  updateData(data) {
    this.data = data;
    this.clearAllCanvases();
    this.draw();
  }

  draw() {
    const { nodes, lineLength, disabledLines } = this;
    const {
      previewCanvas: { node: previewCanvas, backNode },
    } = nodes;
    const data = this.data.filter(({ name }) => !disabledLines.some(s => s === name));

    const { width: previewCanvasW } = this.getWithHeigthByRatio(previewCanvas);
    this.panelW = this.getPanelWidth();
    this.lineLengthPreviewCanvas = getLineLength(data, previewCanvasW);
    this.panelX = previewCanvasW - this.panelW;
    const { from } = this.getGrab({ x: this.panelX, panelWidth: this.panelW });
    const to = getDataMaxLength(data);
    this.maxValue = getMaxValueFromTo({ data, from, to });
    const axialShift = getAxialShift(lineLength, from);

    const backCtx = backNode.getContext("2d");
    backCtx.drawImage(previewCanvas, 0, 0);
    this.yAxis(this.maxValue);
    this.redraw({
      panelX: this.panelX,
      panelW: this.panelW,
      from,
      to,
      maxValue: this.maxValue,
      axialShift,
    });
  }

  redraw({ panelX, panelW, from = 0, to, withPreview = true, maxValue, axialShift = 0 }) {
    const { disabledLines, nodes, lineLength, offset } = this;
    const { bottom } = offset;
    const {
      canvas: { node: canvas, lineWidth: canvasLineWidth },
      previewCanvas: {
        node: previewCanvas,
        backNode: previewBackNode,
        lineWidth: previewLineWidth,
      },
    } = nodes;

    const { height: canvasH } = this.getWithHeigthByRatio(canvas);
    const { height: previewCanvasH } = this.getWithHeigthByRatio(previewCanvas);

    const data = this.data.filter(({ name }) => !disabledLines.some(s => s === name));
    const labels = data[0].labels;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (item.type === "line") {
        // main canvas
        this.drawLine({
          axialShift,
          data: item,
          maxValue: maxValue || getMaxValueFromTo({ data, from, to }),
          canvas,
          lineLength: lineLength,
          lineWidth: canvasLineWidth,
          height: canvasH,
          bottom,
          from,
          to,
          labels,
        });

        // preview canvas
        if (withPreview) {
          this.drawLine({
            height: previewCanvasH,
            data: item,
            maxValue: getMaxValueFromTo({ data, from: 0, to: getDataMaxLength(data) }),
            canvas: previewCanvas,
            lineLength: this.lineLengthPreviewCanvas,
            lineWidth: previewLineWidth,
          });
        }
      }
    }

    if (withPreview) {
      const backCtx = previewBackNode.getContext("2d");
      backCtx.drawImage(previewCanvas, 0, 0);
      this.fillPreviewCanvas(panelX, panelW);
    }
  }

  yAxis(maxValue) {
    const { nodes, offset, devicePixelRatio, disabledLines } = this;
    const {
      canvas: { node: canvas, gridLineColor },
    } = nodes;
    const data = this.data.filter(({ name }) => !disabledLines.some(s => s === name));

    if (data.length < 2) {
      return;
    }

    const left = offset.left * devicePixelRatio;
    const ticks = 6;
    const yScale = Array.from({ length: ticks }, (_, index) => Math.ceil(maxValue / ticks) * index);
    const { width, height } = this.getWithHeigthByRatio(canvas);
    const h = height - offset.bottom * devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    const textPx = 14 * devicePixelRatio;
    ctx.font = `${textPx}px Tahoma serif`;

    for (let i = 0; i < yScale.length; i++) {
      const y = i !== 0 ? h - i * (h / ticks) - 0.5 : h - 0.5;
      ctx.fillStyle = "#9CA1A6";
      ctx.fillText(yScale[i], left, y - 8);
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 1 * devicePixelRatio;
      ctx.moveTo(left, y);
      ctx.lineTo(width + left, y);
    }

    ctx.stroke();
  }

  getGrab({ x, panelWidth }) {
    const { nodes, lineLength, disabledLines, offset, devicePixelRatio } = this;
    const data = this.data.filter(({ name }) => !disabledLines.some(s => s === name));
    const {
      previewCanvas: { node: previewCanvas },
    } = nodes;
    const { width: previewCanvasW } = this.getWithHeigthByRatio(previewCanvas);
    const lines = getDataMaxLength(data) - 1;

    const canvasWidth = lines * lineLength * devicePixelRatio;
    const ratio = canvasWidth / previewCanvasW;

    const from = rateLimit((x * ratio) / (lineLength * devicePixelRatio), 0);
    const to = rateLimit(
      (x * ratio + panelWidth * ratio) / (lineLength * devicePixelRatio),
      0,
      lines + 1,
    );
    const maxValue = getMaxValueFromTo({ data, from, to });

    const limit = to === 0 ? [1, 2] : [lines - 1, 0];

    return {
      lines,
      maxValue,
      from: rateLimit(from, 0, limit[0]),
      to: rateLimit(to, limit[1], lines + 1),
      ratio,
      canvasWidth: canvasWidth + offset.left + offset.right,
    };
  }

  getWithHeigthByRatio(node) {
    const { devicePixelRatio } = this;
    const { left = 0, right = 0 } = this.offset;

    const { width: w, height: h } = node.getBoundingClientRect();

    return {
      width: w * devicePixelRatio - left * devicePixelRatio - right * devicePixelRatio,
      height: h * devicePixelRatio,
    };
  }

  drawLine({
    data,
    maxValue,
    canvas,
    height,
    lineLength,
    lineWidth,
    from = 0,
    to,
    axialShift = 0,
    bottom = 0,
    labels = [],
  }) {
    const { offset, devicePixelRatio, labelsIsDrawn } = this;
    const { values, color } = data;
    const { left } = offset;
    const ctx = canvas.getContext("2d");
    ctx.save();

    let prevX = 0;
    let prevY = 0;

    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    const textPx = 14 * devicePixelRatio;
    ctx.font = `${textPx}px Tahoma serif`;
    ctx.textAlign = "center";

    let startIndex = 0;
    const h = height - bottom * devicePixelRatio;

    const labelWidth = 140;
    const fromInt = Math.floor(from);
    const divider = rateLimit(Math.round(labelWidth / lineLength), 1);

    for (let i = fromInt; i < values.length; i++) {
      const roundLineCap = startIndex === 0 ? lineWidth / 2 : 0;
      const x = lineLength * startIndex + ((left + roundLineCap) * devicePixelRatio - axialShift);
      const y = h - (((values[i] * 100) / maxValue) * h) / 100;
      const rX = (0.5 + x) | 0;
      const rY = (0.5 + y) | 0;

      if (startIndex === 0) {
        const items = new Array(Math.ceil(left / lineLength));

        if (items.length > 0) {
          let extraX = x;
          let extraY = y;

          ctx.beginPath();
          for (let index = 0; index < items.length; index++) {
            const x1 = x - lineLength * (index + 1);
            const y1 = h - (((values[i - (index + 1)] * 100) / maxValue) * h) / 100;

            if (index === 0) {
              ctx.lineTo(extraX, extraY);
            }

            ctx.lineTo(x1, y1);
            extraX = x1;
            extraY = y1;
          }

          ctx.stroke();
        }
      }

      if (!labelsIsDrawn) {
        const label = labels[i];
        const remainderFrom = fromInt % divider;
        const remainderIndex = startIndex % divider;
        const lastLabel = startIndex === values.length - fromInt - 1;

        ctx.save();
        if (lastLabel) {
          ctx.textAlign = "right";
        } else if (i === 0) {
          ctx.textAlign = "left";
        }

        if (divider > 1 && remainderFrom + remainderIndex === divider - 1) {
          ctx.fillText(label, x, h + 24 * devicePixelRatio);
        } else if (divider === 1) {
          ctx.fillText(label, x, h + 24 * devicePixelRatio);
        }
        ctx.restore();
      }

      ctx.beginPath();

      if (startIndex > 0) {
        ctx.moveTo(prevX, prevY);
      }

      ctx.lineTo(rX, rY);
      prevX = rX;
      prevY = rY;

      ctx.stroke();
      startIndex += 1;
      if (Math.ceil(to + 2) < i) {
        break;
      }
    }

    this.labelsIsDrawn = true;
    ctx.restore();
  }

  initControl({ name, color, chart }) {
    const { nodes } = this;
    const { container } = nodes;
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.innerText = `graph ${chart}`;
    const icon = document.createElement("div");
    icon.classList.add(`${this.classNamePrefix}-checkmark-icon`);
    icon.style.borderColor = color;
    label.classList.add(`${this.classNamePrefix}-control`);
    const input = document.createElement("input");
    input.addEventListener("change", this.onChange.bind(this, name));
    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(text);
    input.setAttribute("type", "checkbox");
    input.setAttribute("checked", "checked");
    container.node.appendChild(label);
  }

  onChange(name) {
    const { panelX, panelW } = this;

    this.clearAllCanvases();
    this.onDisabledLine(name);
    const { from, to, canvasWidth, maxValue } = this.getGrab({ x: panelX, panelWidth: panelW });
    const axialShift = getAxialShift(this.lineLength, from);
    this.yAxis(maxValue);
    this.labelsIsDrawn = false;
    this.redraw({ panelX, panelW, from, to, canvasWidth, axialShift });
  }

  clearAllCanvases() {
    const { nodes } = this;

    for (let key in nodes) {
      const { node, backNode } = nodes[key];
      if (key !== "container") {
        this.clearCanvas(node);
        this.clearCanvas(backNode);
      }
    }
  }

  onDisabledLine(name) {
    const isDisabled = this.disabledLines.some(item => item === name);

    if (isDisabled) {
      this.disabledLines = this.disabledLines.filter(item => item !== name);
    } else {
      this.disabledLines.push(name);
    }
  }

  appendNodes() {
    const { data, nodes, header } = this;

    let container = null;

    for (let key in nodes) {
      const { node } = nodes[key];
      node.classList.add(`${this.classNamePrefix}-${key}`);
      if (key !== "container" && container) {
        container.appendChild(node);
      } else {
        container = node;
        this.root.appendChild(node);
        if (header) {
          const node = document.createElement("div");
          node.innerHTML = header;
          node.classList.add(`${this.classNamePrefix}-header`);
          container.appendChild(node);
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item.type === "line") {
        this.initControl(item);
      }
    }
  }

  handleResize() {
    this.resizeNodes();
    this.labelsIsDrawn = false;
    this.draw();
  }

  resizeNodes() {
    const { nodes, devicePixelRatio } = this;

    let container = null;

    for (let key in nodes) {
      const { node, height, backNode } = nodes[key];

      if (key !== "container" && container) {
        const { width } = container.getBoundingClientRect();

        node.style.width = width + "px";
        node.style.height = height + "px";
        node.setAttribute("width", width * devicePixelRatio);
        node.setAttribute("height", height * devicePixelRatio);

        if (backNode) {
          backNode.style.width = width + "px";
          backNode.style.height = height + "px";
          backNode.setAttribute("width", width * devicePixelRatio);
          backNode.setAttribute("height", height * devicePixelRatio);
        }
      } else {
        container = node;
      }
    }
  }

  setListeners() {
    const {
      nodes: {
        canvas: { node: canvas },
      },
    } = this;
    document.addEventListener("mousemove", this.handleMove.bind(this));
    document.addEventListener("touchmove", this.handleMove.bind(this));
    document.addEventListener("mousedown", this.handleDown.bind(this));
    document.addEventListener("touchstart", this.handleDown.bind(this));
    document.addEventListener("mouseup", this.handleUp.bind(this));
    document.addEventListener("touchend", this.handleUp.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
    canvas.addEventListener("mousemove", this.handleMoveInChart.bind(this));
    canvas.addEventListener("touchmove", this.handleMoveInChart.bind(this));
    canvas.addEventListener("mouseleave", this.handleLeaveChart.bind(this));
  }

  clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  getPanelWidth() {
    const { nodes, data, lineLength } = this;
    const { canvas, previewCanvas } = nodes;

    const { width: canvasWidth } = this.getWithHeigthByRatio(canvas.node);

    const { width: previewCanvasWidth } = this.getWithHeigthByRatio(previewCanvas.node);

    const lineLengthPreviewCanvas = getLineLength(data, previewCanvasWidth);

    const panelWidth = (canvasWidth / lineLength) * lineLengthPreviewCanvas;

    return panelWidth;
  }

  getPanelRect() {
    const { panelW, controlBorderWidth, nodes, offset, panelX } = this;
    const { previewCanvas } = nodes;
    const { left, right } = offset;

    const { height } = this.getWithHeigthByRatio(previewCanvas.node);

    return [
      panelX + controlBorderWidth + left,
      0,
      panelX + panelW - controlBorderWidth + right,
      height,
    ];
  }

  resizePanel(x, width) {
    const { startPanelResize, panelX, panelW } = this;
    const isRightBorder = startPanelResize > panelX + panelW;
    const positionX = x - startPanelResize;
    const opposite = isRightBorder ? positionX + panelW < 0 : panelW - positionX > 0;
    const rPanelX = positionX + panelW < 0 ? panelX + positionX + panelW : panelX;
    const lPanelX = panelW - positionX > 0 ? panelX + positionX : panelX + panelW;
    const panelXPos = isRightBorder ? rPanelX : lPanelX;
    const pW = isRightBorder ? Math.abs(positionX + panelW) : Math.abs(panelW - positionX);

    const limitWidth = opposite ? pW + rateLimit(panelXPos, 0) : width - rateLimit(panelXPos, 0);

    return {
      pX: rateLimit(panelXPos, 0),
      pW: panelXPos > 0 ? rateLimit(pW, 0, limitWidth) : rateLimit(pW + panelXPos, 0, limitWidth),
    };
  }

  handleMove(e) {
    const {
      nodes,
      startPanelGrabbing,
      panelX,
      panelW,
      maxValue,
      lineLength,
      startPanelResize,
      devicePixelRatio,
    } = this;
    const { previewCanvas } = nodes;
    const {
      canvas: { node: canvas },
    } = nodes;
    const { move, leftBorder, rightBorder } = this.insidePanel(e);
    const isNotAction = startPanelGrabbing === null && startPanelResize === null;
    const { x } = getPosition(e, devicePixelRatio);
    const { width: canvasWidth } = this.getWithHeigthByRatio(canvas);
    const { width } = this.getWithHeigthByRatio(previewCanvas.node);

    if (isNotAction && move) {
      previewCanvas.node.style.cursor = "grab";
    } else if (isNotAction && (leftBorder || rightBorder)) {
      previewCanvas.node.style.cursor = "col-resize";
    } else if (isNumeric(startPanelResize)) {
      // panel resize
      const { pX, pW } = this.resizePanel(x, width);

      this.clearCanvas(previewCanvas.node);
      const ctxPreview = previewCanvas.node.getContext("2d");
      ctxPreview.drawImage(previewCanvas.backNode, 0, 0);
      this.fillPreviewCanvas(pX, pW);

      const { from, to, maxValue } = this.getGrab({ x: pX, panelWidth: pW });
      this.maxValue = maxValue;
      this.lineLength = canvasWidth / (to - from);

      const axialShift = getAxialShift(this.lineLength, from);

      this.clearCanvas(canvas);
      this.yAxis(maxValue);
      this.labelsIsDrawn = false;
      this.redraw({
        panelW: pW,
        panelX: pX,
        withPreview: false,
        from,
        to,
        axialShift,
      });
    } else if (isNumeric(startPanelGrabbing)) {
      // panel grab
      const positionX = x - startPanelGrabbing;
      const nextX = rateLimit(panelX + positionX, 0, width - panelW);

      this.clearCanvas(previewCanvas.node);
      const ctxPreview = previewCanvas.node.getContext("2d");
      ctxPreview.drawImage(previewCanvas.backNode, 0, 0);
      this.fillPreviewCanvas(nextX, panelW);

      const { maxValue: nextMaxValue, from, to } = this.getGrab({
        x: nextX,
        panelWidth: panelW,
      });

      if (maxValue !== nextMaxValue) {
        this.maxValue = nextMaxValue;
      }

      const axialShift = getAxialShift(lineLength, from);
      this.clearCanvas(canvas);
      this.yAxis(nextMaxValue);
      this.labelsIsDrawn = false;
      this.redraw({
        panelX: nextX,
        panelW: panelW,
        from,
        to,
        withPreview: false,
        maxValue: nextMaxValue,
        axialShift,
      });
    } else if (isNotAction) {
      previewCanvas.node.style.cursor = "default";
    }
  }

  handleUp(e) {
    const { nodes, startPanelGrabbing, startPanelResize, panelX, devicePixelRatio } = this;
    const { previewCanvas } = nodes;
    const { node: previewCanvasNode } = previewCanvas;

    const { x } = getPosition(e, devicePixelRatio);
    const { width } = this.getWithHeigthByRatio(previewCanvasNode);

    if (isNumeric(startPanelGrabbing)) {
      const positionX = x - startPanelGrabbing;
      this.panelX = rateLimit(panelX + positionX, 0, width - this.panelW);

      this.startPanelGrabbing = null;
      document.documentElement.style.cursor = "";
    } else if (isNumeric(startPanelResize)) {
      const { pX, pW } = this.resizePanel(x, width);
      this.panelX = pX;
      this.panelW = pW;

      document.documentElement.style.cursor = "";
      this.startPanelResize = null;
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
    const { devicePixelRatio, nodes } = this;
    const { previewCanvas } = nodes;
    const { x } = getPosition(e);
    const { move, leftBorder, rightBorder } = this.insidePanel(e);

    if (move) {
      this.startPanelGrabbing = x * devicePixelRatio;
      document.documentElement.style.cursor = "grabbing";
      previewCanvas.node.style.cursor = "grabbing";
    } else if (leftBorder || rightBorder) {
      this.startPanelResize = x * devicePixelRatio;
      document.documentElement.style.cursor = "col-resize";
      previewCanvas.node.style.cursor = "col-resize";
    }
  }

  handleMoveInChart(e) {
    const {
      disabledLines,
      devicePixelRatio,
      lineLength,
      panelX,
      panelW,
      offset: { left },
      nodes: {
        canvas: { node: canvas, backNode },
      },
      selectedItem,
    } = this;

    const data = this.data.filter(({ name }) => !disabledLines.some(s => s === name));
    const { x } = getPosition(e, devicePixelRatio);
    const { from } = this.getGrab({ x: panelX, panelWidth: panelW });
    const index = rateLimit(
      Math.floor((x - left * devicePixelRatio) / lineLength + from),
      0,
      getDataMaxLength(data) - 1,
    );
    const backCtx = backNode.getContext("2d");
    const ctx = canvas.getContext("2d");

    if (selectedItem === null) {
      backCtx.drawImage(canvas, 0, 0);
    }

    if (selectedItem !== null && (selectedItem && selectedItem[0] === index)) {
      return;
    } else if (selectedItem !== null && (selectedItem && selectedItem[0] !== index)) {
      this.clearCanvas(canvas);
      ctx.drawImage(backNode, 0, 0);
    }

    const selectedData = [];

    selectedData.push(index);

    for (let i = 0; i < data.length; i++) {
      const { type, values, color, name } = data[i];
      const value = values[index];

      if (type !== "x") {
        selectedData.push({
          name,
          color,
          value,
        });
      } else {
        const datetime = new Date(value);
        const date = datetime.getDate();
        const month = datetime.toLocaleString("en-us", {
          month: "short",
        });
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = days[datetime.getDay()];
        selectedData.push({
          type,
          value: `${dayName}, ${month}, ${date}`,
        });
      }
    }

    selectedData.sort((a, b) => b.value - a.value);

    this.selectedItem = selectedData;
    if (selectedData && selectedData.length < 3) {
      return;
    }
    this.drawTooltip({ index, from });
  }

  drawTooltip({ index, from }) {
    const {
      nodes: {
        canvas: { node: canvas, lineWidth, gridLineColor, backNode },
      },
      maxValue,
      selectedItem,
      lineLength,
      devicePixelRatio,
      offset: { left, bottom },
    } = this;
    const { height } = this.getWithHeigthByRatio(canvas);
    const ctx = canvas.getContext("2d");

    const r = 5 * devicePixelRatio;
    const circleLw = 2 * devicePixelRatio;
    const h = height - bottom * devicePixelRatio;
    const axialShift = getAxialShift(lineLength, from);
    const x = lineLength * (index - Math.floor(from)) + left * devicePixelRatio - axialShift;
    const blankPaddingX = 15 * devicePixelRatio;
    const blankPaddingY = 10 * devicePixelRatio;

    const bw = 100 * devicePixelRatio;
    const bh = 90 * devicePixelRatio;

    let blankWidth = blankPaddingX * 2;
    let blankHeight = blankPaddingY * 2;
    let textPaddingLeft = blankPaddingX;

    for (let i = 1; i < selectedItem.length; i++) {
      const { type, color, value } = selectedItem[i];
      const y = h - (((value * 100) / maxValue) * h) / 100 + lineWidth / 2;
      if (type !== "x") {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = circleLw;
        ctx.strokeStyle = color;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = color;
        const valueFontPx = 18 * devicePixelRatio;
        ctx.font = `bold ${valueFontPx}px Tahoma serif`;
        const text = ctx.measureText(value);
        ctx.fillText(value, x + textPaddingLeft, 148 + blankPaddingY);
        const nameFontPx = 14 * devicePixelRatio;
        blankHeight += valueFontPx + nameFontPx;
        ctx.font = `normal ${nameFontPx}px Tahoma serif`;
        const tttt = "ggwp nore 4444";
        const textBottom = ctx.measureText(tttt);
        ctx.fillText(tttt, x + textPaddingLeft, 144 + blankPaddingY + 18 * devicePixelRatio);
        const itemWidth = Math.max(text.width + 20, textBottom.width + 20);

        if (i === 3) {
          blankWidth = Math.max(itemWidth, blankWidth);
        } else {
          blankWidth += itemWidth;
        }
        textPaddingLeft += itemWidth;
        ctx.stroke();
      } else {
        ctx.save();
        ctx.lineWidth = devicePixelRatio;
        ctx.strokeStyle = gridLineColor;
        ctx.shadowColor = gridLineColor;
        ctx.shadowBlur = 2;
        ctx.fillStyle = "#fff";
        roundRect({ canvas, x, y: 100, w: bw, h: bh, r: 6 });
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        const textPx = 16 * devicePixelRatio;
        ctx.font = `bold ${textPx}px Tahoma serif`;
        ctx.fillStyle = "#262c37";
        const dateText = ctx.measureText(value);
        blankWidth += dateText.width;
        blankHeight += textPx + 10 * devicePixelRatio;
        ctx.fillText(value, x + blankPaddingX, 120 + blankPaddingY);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.lineWidth = 1 * devicePixelRatio;
        ctx.strokeStyle = gridLineColor;
        ctx.moveTo(x, height - bottom * devicePixelRatio);
        ctx.lineTo(x, 0);
        ctx.stroke();
      }
    }
    console.info("--> ggwp 4444", {
      blankWidth,
      blankHeight,
    });
  }

  handleLeaveChart() {
    const {
      nodes: {
        canvas: { node: canvas, backNode },
      },
    } = this;
    this.clearCanvas(canvas);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(backNode, 0, 0);
    this.clearCanvas(backNode);
    this.selectedItem = null;
  }

  insidePanel(e) {
    const { controlBorderWidth, devicePixelRatio } = this;
    const { x, y } = getPosition(e, devicePixelRatio);
    const panelReact = this.getPanelRect();
    const [xMin, yMin, xMax, yMax] = panelReact;

    const leftBorderRect = [
      xMin - controlBorderWidth * devicePixelRatio,
      yMin,
      xMin + controlBorderWidth * devicePixelRatio,
      yMax,
    ];
    const rightBorderRect = [xMax, yMin, xMax + controlBorderWidth * devicePixelRatio, yMax];

    return {
      leftBorder: isDotInsideRect([x, y], leftBorderRect),
      rightBorder: isDotInsideRect([x, y], rightBorderRect),
      move: isDotInsideRect([x, y], panelReact),
    };
  }

  fillPreviewCanvas(x, panelWidth) {
    const { nodes, controlBorderWidth, offset, devicePixelRatio } = this;
    const {
      previewCanvas: { node: previewCanvas },
    } = nodes;
    const { left } = offset;

    const { width, height } = this.getWithHeigthByRatio(previewCanvas);

    const ctx = previewCanvas.getContext("2d");

    ctx.beginPath();
    ctx.fillStyle = hexToRGB("#F4F9FC", 0.76);

    // before
    ctx.rect(left * devicePixelRatio, 0, x, height);
    ctx.fill();

    ctx.beginPath();
    // after
    ctx.rect(x + panelWidth + left * devicePixelRatio, 0, width - x - panelWidth, height);
    ctx.fill();

    // center
    ctx.beginPath();
    ctx.lineWidth = controlBorderWidth;
    ctx.strokeStyle = "rgba(0,0,0, 0.14)";
    ctx.rect(
      x + left * devicePixelRatio + controlBorderWidth / 2,
      0,
      panelWidth - controlBorderWidth,
      height,
    );
    ctx.stroke();
  }
}
