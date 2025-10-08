import { getRubinTVUrl } from "@/utils/utils";

const telescopePrefixes = {
  MC: "Simonyi",
  AT: "AuxTel",
};

export default function RubinTVLink({ dayObs, seqNum, exposureName }) {
  // Expected behaviour is to pass dayObs & seqNum
  // straight to the getRubinTVUrl helper, but in
  // case of invalid or missing data, we have a
  // fallback to derive these from exp name.
  const invalidDayObs = !dayObs || isNaN(Number(dayObs));
  const invalidSeqNum = !seqNum || isNaN(Number(seqNum));

  if ((invalidDayObs || invalidSeqNum) && exposureName) {
    // Schema: length=20 chars
    if (exposureName.length === 20) {
      const suffix = exposureName.slice(-15); // "20250101_000123"
      const dayObsCandidate = suffix.slice(0, 8);
      const seqNumCandidate = suffix.slice(9);

      if (!isNaN(Number(dayObsCandidate)) && !isNaN(Number(seqNumCandidate))) {
        dayObs = dayObsCandidate;
        seqNum = String(parseInt(seqNumCandidate, 10)); // strip leading zeros
      }
    }
  }
  // Derive telescope from exposureName
  const telescope = telescopePrefixes[exposureName.slice(0, 2)] ?? "";

  const url = getRubinTVUrl(telescope, dayObs, seqNum);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-400 underline hover:text-sky-700"
    >
      {telescope === "Simonyi" ? "Post-ISR Mosaic" : "Mount Monitor"}
    </a>
  );
}
