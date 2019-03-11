const roundUsing = (num, func, prec) => {
  let temp = num * Math.pow(10, prec);
  temp = func(temp);
  return temp / Math.pow(10, prec);
};