import { createContext, useState } from "react";

export const HoverContext = createContext({
  hoveredExposureId: null,
  setHoveredExposureId: () => {},
});

export function HoverContextProvider({ children }) {
  const [hoveredExposureId, setHoveredExposureId] = useState(null);

  return (
    <HoverContext.Provider value={{ hoveredExposureId, setHoveredExposureId }}>
      {children}
    </HoverContext.Provider>
  );
}
