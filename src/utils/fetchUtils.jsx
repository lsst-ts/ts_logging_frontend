/**
 * Calculates the efficiency of night hours usage, accounting for exposure time and weather loss.
 *
 * @param {number} nightHours - The total number of night hours available.
 * @param {number} sumExpTime - The sum of exposure time in seconds.
 * @param {number} weatherLoss - The total time lost due to weather in seconds.
 * @returns {number} The calculated efficiency as a ratio (0 if nightHours is 0).
 */
const calculateEfficiency = (nightHours, sumExpTime, weatherLoss) => {
  let eff = 0.0;
  if (nightHours !== 0) {
    eff = sumExpTime / (nightHours * 60 * 60 - weatherLoss);
  }
  return eff === 0 ? 0 : eff.toFixed(2);
};

/**
 * Calculates the total time loss and provides a breakdown of the loss due to weather and faults.
 *
 * @param {number} weatherLoss - The amount of time lost due to weather (in seconds).
 * @param {number} faultLoss - The amount of time lost due to faults (in seconds).
 * @returns {[string, string]} A tuple where the first element is the total time loss as a string (e.g., "5 seconds"),
 * and the second element is a string detailing the percentage breakdown of weather and fault losses.
 */
const calculateTimeLoss = (weatherLoss, faultLoss) => {
  weatherLoss = weatherLoss / 3600; // Convert seconds to hours
  faultLoss = faultLoss / 3600; // Convert seconds to hours
  let loss = weatherLoss + faultLoss;

  let timeLoss = "0 hours";
  let timeLossDetails = "(- weather; - fault)";

  if (loss > 0) {
    let weatherPercent = (weatherLoss / loss) * 100;
    let faultPercent = (faultLoss / loss) * 100;
    timeLoss = `${loss} hours`;
    timeLossDetails = `(${weatherPercent}% weather; ${faultPercent}% fault)`;
  }

  return [timeLoss, timeLossDetails];
};
export { calculateEfficiency, calculateTimeLoss };
