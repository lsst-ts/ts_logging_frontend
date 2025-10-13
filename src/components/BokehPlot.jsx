import { useEffect, useRef } from "react";
import * as Bokeh from "@bokeh/bokehjs";

const BokehPlot = ({ plotData }) => {
  const plotRef = useRef(null);
  const embeddedRef = useRef(false);

  useEffect(() => {
    if (!plotData || embeddedRef.current === true) return;

    if (plotRef.current) {
      plotRef.current.innerHTML = "";
      try {
        Bokeh.embed.embed_item(plotData, plotRef.current);
        embeddedRef.current = true;
      } catch (error) {
        console.error("Error embedding Bokeh plot:", error);
      }
    }

    return () => {
      if (plotRef.current) {
        plotRef.current.innerHTML = "";
        embeddedRef.current = false;
      }
    };
  }, [plotData]);

  return (
    <div
      ref={plotRef}
      style={{ height: "auto", width: "auto", minHeight: "300px" }}
    />
  );
};
export default BokehPlot;
