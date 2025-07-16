import { getRubinTVUrl } from "@/utils/utils";

export default function RubinTVLink({ dayObs, seqNum }) {
  const url = getRubinTVUrl(dayObs, seqNum);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-400 underline hover:text-sky-700"
    >
      calexp
    </a>
  );
}
