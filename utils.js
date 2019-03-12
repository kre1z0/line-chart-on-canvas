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
