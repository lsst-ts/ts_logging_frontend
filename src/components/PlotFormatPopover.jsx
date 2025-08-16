import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import {
  PLOT_COLOR_OPTIONS,
  PLOT_DOT_OPTIONS,
  PLOT_BAND_MARKER_OPTIONS,
} from "@/components/PLOT_DEFINITIONS";

function PlotFormatPopover({
  plotShape,
  setPlotShape,
  plotColor,
  setPlotColor,
  bandMarker,
  setBandMarker,
}) {
  return (
    <div className="flex flex-row justify-between gap-8 text-black">
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="text-sm btn bg-white text-black w-40 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                        flex justify-center items-center py-2 px-4 
                        hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
          >
            Plot Format
          </button>
        </DialogTrigger>
        <DialogContent className="!max-w-[500px] m-2 pb-8">
          <h1 className="text-lg font-thin mb-2">Format Plot Display</h1>

          {/* Shape Selection */}
          <h2 className="text-md font-thin">Shape</h2>
          <RadioGroup
            value={plotShape}
            onValueChange={setPlotShape}
            className="pl-16 pr-5 grid grid-cols-2 gap-x-4"
          >
            {PLOT_DOT_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem
                  id={`shape-${key}`}
                  value={key}
                  className="border border-sky-700 hover:bg-sky-700/20 hover:text-white focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 focus:ring-offset-white"
                />
                <Label htmlFor={`shape-${key}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Separator className="bg-sky-700/50 mt-4 mb-2" />

          {/* Color Selection */}
          <h2 className="text-md font-thin">Color</h2>
          <RadioGroup
            value={plotColor}
            onValueChange={setPlotColor}
            className="pl-16 pr-5 grid grid-cols-2 gap-x-4 gap-y-3"
          >
            {PLOT_COLOR_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem
                  id={`color-${key}`}
                  value={key}
                  className="border border-sky-700 hover:bg-sky-700/20 hover:text-white focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 focus:ring-offset-white"
                />
                <Label htmlFor={`color-${key}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Separator className="bg-sky-700/50 mt-4 mb-2" />

          {/* Band Marker Selection */}
          <h2 className="text-md font-thin">
            Band Markers (relevant data only)
          </h2>
          <RadioGroup
            value={bandMarker}
            onValueChange={setBandMarker}
            className="pl-8 pr-5 grid grid-cols-3 gap-x-4 gap-y-3"
          >
            {PLOT_BAND_MARKER_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem
                  id={`band-${key}`}
                  value={key}
                  className="border border-sky-700 hover:bg-sky-700/20 hover:text-white focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 focus:ring-offset-white"
                />
                <Label htmlFor={`band-${key}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlotFormatPopover;
