const calculateEfficiency = (nightHours, sumExpTime, weatherLoss) => {
  let eff = 0.0;
  if (nightHours !== 0) {
    eff = sumExpTime / (nightHours * 60 * 60 - weatherLoss);
  }
  return eff;
};

export { calculateEfficiency };
