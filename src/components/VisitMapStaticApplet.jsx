import AppletCard, {
  EmptyDisplayState,
  useAppletState,
} from "@/components/AppletCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

/**
 * Render the static visit map image, or a standard empty state when the
 * applet has no data.
 *
 * Reads the applet display state from context (provided by AppletCard). Only
 * the "noData" state needs handling here: a fetch "error" is already shown by
 * AppletStateBody and never reaches this content.
 *
 * @param {Object} props
 * @param {string} props.mapData URL of the static visit map image to display.
 */
function StaticVisitMap({ mapData }) {
  const { state, message } = useAppletState();

  if (state === "noData") {
    return <EmptyDisplayState message={message} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-1.5 sm:p-2">
      <img
        src={mapData}
        alt="Visit Map"
        className="block h-auto max-h-full w-auto max-w-full rounded-md border-2 border-black object-contain"
      />
    </div>
  );
}

/**
 * Render the visit map as a static image applet with its own header.
 *
 * @param {Object} props
 * @param {string} props.mapData URL of the static visit map image.
 * @param {boolean} props.mapLoading Whether the map is still loading.
 * @param {Object} props.sources Map of source -> `{ ok, message?, noData? }`.
 * @param {string[]} props.required Sources required for a sensible display.
 */
export default function VisitMapStaticApplet({
  mapData,
  mapLoading,
  sources = {},
  required = [],
}) {
  return (
    <AppletCard
      title="Visit Map"
      actions={
        <>
          <Popover>
            <PopoverTrigger className="self-end min-w-4 cursor-pointer">
              <img src={DownloadIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button. Once
              implemented, clicking here will download this Applet's data to a
              .csv file.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4 cursor-pointer">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 flex flex-col max-w-5xl mx-auto gap-y-2">
              <p>
                A full-sky map showing how many times each area has been
                observed over the selected dates.
              </p>
              <p>
                Declination (Dec) lines are labelled from -60° to +60° every 30°
                horizontally.
              </p>
              <p>
                Right ascension (RA) lines are labelled in degrees from 0° to
                300° every 60° vertically.
              </p>
              <p>Brighter areas have more visits.</p>
            </PopoverContent>
          </Popover>
        </>
      }
      sources={sources}
      required={required}
      loading={mapLoading}
      skeleton={<Skeleton className="w-full h-full bg-stone-900 rounded-md" />}
      readyClassName="h-80"
      maintainHeight
    >
      <StaticVisitMap mapData={mapData} />
    </AppletCard>
  );
}
