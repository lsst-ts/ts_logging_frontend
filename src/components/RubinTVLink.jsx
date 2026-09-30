import { getRubinTVLinkUrl } from "@/utils/utils";

export default function RubinTVLink({ dayObs, seqNum, exposureName }) {
  const { url, telescope } = getRubinTVLinkUrl({
    dayObs,
    seqNum,
    exposureName,
  });
  if (!url) return null;

  return (
    <div className="p-1 rounded">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-500 underline hover:text-sky-300"
      >
        {telescope === "Simonyi" ? "Post-ISR Mosaic" : "Mount Monitor"}
      </a>
    </div>
  );
}
