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

function getPositionX(e) {
  return e.type === "touchmove" ? e.touches[0].pageX : e.clientX;
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
  const { columns, colors, types } = data;

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

function getMaxValue(data) {
  const max = data.reduce((prevMax, { max }) => Math.max(prevMax, max || 0), 0);
  const maxLength = Math.ceil(Math.log10(max + 1));
  return roundUsing(max, Math.ceil, -maxLength + 2);
}

function getSectionWidth(items, containerWidth) {
  const length = items.length - 1;
  const remainder = containerWidth % length;
  return Math.floor(containerWidth / length) + remainder / length;
}
