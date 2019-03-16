function roundUsing(num, func, prec) {
  let temp = num * Math.pow(10, prec);
  temp = func(temp);
  return temp / Math.pow(10, prec);
}

function hexToRGB(hex, alpha) {
  if (!hex) return;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getPosition(e, ratio = 1) {
  const { left, top } = e.target.getBoundingClientRect();

  if (e.type === "touchmove" || e.type === "touchstart") {
    return { x: (e.touches[0].pageX - left) * ratio, y: (e.touches[0].pageY - top) * ratio };
  } else if (e.type === "touchend") {
    return {
      x: e.changedTouches[e.changedTouches.length - 1].pageX * ratio,
      y: e.changedTouches[e.changedTouches.length - 1].pageY * ratio,
    };
  } else {
    return { x: (e.clientX - left) * ratio, y: (e.clientY - top) * ratio };
  }
}

function rateLimit(n, min, max) {
  if (n < min) {
    return min;
  } else if (n > max) {
    return max;
  } else {
    return n;
  }
}

function normalizeData(data) {
  const { columns, colors, types, names } = data;

  const normalizedData = [];

  for (let i = 0; i < columns.length; i++) {
    const name = columns[i][0];
    const values = columns[i].slice(1);

    const obj = {
      type: types[name],
      values,
      name,
    };

    if (name !== "x") {
      const color = colors[name];
      const chart = names[name];

      normalizedData.push({
        ...obj,
        color,
        chart,
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

function getMaxValue(data) {
  const max = data.reduce((prevMax, { max }) => Math.max(prevMax, max || 0), 0);
  const maxLength = Math.ceil(Math.log10(max + 1));
  return Math.ceil(roundUsing(max, Math.ceil, -maxLength + 2));
}

function getMaxValueFromTo({ data, from, to }) {
  let max = 0;

  for (let i = 0; i < data.length; i++) {
    const type = data[i].type;
    if (type === "line") {
      const values = data[i].values.slice(from, to);
      max = Math.max(max, ...values);
    }
  }

  const maxLength = Math.ceil(Math.log10(max + 1));
  return Math.ceil(roundUsing(max, Math.ceil, -maxLength + 2));
}

function getDataMaxLength(data) {
  let max = 0;

  for (let i = 0; i < data.length; i++) {
    max = Math.max(max, data[i].values.length);
  }

  return max;
}

function getLineLength(data, containerWidth, withRemainder = true) {
  const length = getDataMaxLength(data) - 1;

  if (withRemainder) {
    const remainder = containerWidth % length;

    return Math.floor(containerWidth / length) + remainder / length;
  } else {
    return containerWidth / length;
  }
}

function isDotInsideRect(position, rect) {
  const [x, y] = position;
  const [xMin, yMin, xMax, yMax] = rect;

  return xMin <= x && xMax >= x && yMin <= y && yMax >= y;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
