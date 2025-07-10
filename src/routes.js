import {
  createRootRoute,
  createRouter,
  createRoute,
} from "@tanstack/react-router";
import Layout from "./pages/layout";
import DataLog from "./pages/data-log";
import ContextFeed from "./pages/context-feed";
import Summary from "./pages/summary";
import { z } from "zod";
import { DateTime } from "luxon";

import SearchParamErrorComponent from "./components/search-param-error-component";
import { Telescope } from "lucide-react";

const rootRoute = createRootRoute({
  component: Layout,
});

const yyyymmddRegex = /^\d{8}$/;

const dayobsInt = z.coerce
  .string()
  .regex(yyyymmddRegex, "Dayobs must be in yyyyMMdd format.")
  .refine(
    (val) => {
      const y = parseInt(val.slice(0, 4));
      const m = parseInt(val.slice(4, 6));
      const d = parseInt(val.slice(6, 8));
      const dt = DateTime.fromObject({ year: y, month: m, day: d });
      return dt.isValid;
    },
    {
      message: "Not a valid calendar date. Dayobs must be in yyyyMMdd format.",
    },
  )
  .transform((val) => parseInt(val, 10));

const searchParamsSchema = z
  .object({
    startDayobs: dayobsInt.default(() =>
      DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd"),
    ),
    endDayobs: dayobsInt.default(() =>
      DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd"),
    ),
    // instrument: z.enum(["LSSTCam", "LATISS"]).default("LSSTCam"),
    telescope: z.enum(["Simonyi", "AuxTel"]).default("Simonyi"),
  })
  .refine((obj) => obj.startDayobs <= obj.endDayobs, {
    message: "startDayobs must be before or equal to endDayobs.",
    path: ["startDayobs"],
  });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Summary,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const dataLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-log",
  component: DataLog,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const contextFeedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/context-feed",
  component: ContextFeed,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    dashboardRoute,
    dataLogRoute,
    contextFeedRoute,
  ]),
  basepath: "/nightlydigest",
});

export default router;
