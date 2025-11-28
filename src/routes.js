import {
  createRootRoute,
  createRouter,
  createRoute,
} from "@tanstack/react-router";
import Layout from "./pages/Layout";
import DataLog from "./pages/DataLog";
import ContextFeed from "./pages/ContextFeed";
import Digest from "./pages/Digest";
import Plots from "./pages/Plots";
import VisitMaps from "./pages/VisitMaps";
import { z } from "zod";
import { DateTime } from "luxon";

import SearchParamErrorComponent from "./components/search-param-error-component";
import { dataLogColumns } from "@/components/DataLogColumns";
import { getDayobsStartUTC, getDayobsEndUTC } from "./utils/timeUtils";

export const GLOBAL_SEARCH_PARAMS = [
  "startDayobs",
  "endDayobs",
  "telescope",
  "startTime",
  "endTime",
];

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

const defaultDayObs = () =>
  DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd");

// Create plain object schema
export const baseSearchParamsSchema = z.object({
  startDayobs: dayobsInt.default(defaultDayObs),
  endDayobs: dayobsInt.default(defaultDayObs),
  telescope: z.enum(["Simonyi", "AuxTel"]).default("Simonyi"),
  // these are marked as optional because they are added automatically
  startTime: z.coerce.number().int().min(0).optional(),
  endTime: z.coerce.number().int().min(0).optional(),
});

// Apply common validations and transformations to search params schemas
const applyCommonValidations = (schema) =>
  schema
    .transform((search) => {
      // Set default startTime and endTime based on dayobs if not provided
      // Has to be done as a transformation because it's dependant on another value
      return {
        ...search,
        startTime:
          search.startTime ??
          getDayobsStartUTC(search.startDayobs.toString()).toMillis(),
        endTime:
          search.endTime ??
          getDayobsEndUTC(search.endDayobs.toString()).toMillis(),
      };
    })
    .refine((obj) => obj.startDayobs <= obj.endDayobs, {
      message: "startDayobs must be before or equal to endDayobs.",
      path: ["startDayobs"],
    })
    .transform((search) => {
      // Ensure that startTime <= endTime by swapping them if required
      if (search.startTime > search.endTime) {
        return {
          ...search,
          startTime: search.endTime,
          endTime: search.startTime,
        };
      }
      return search;
    })
    .transform((search) => {
      // Ensure that start and end times fall within the dayobs boundaries
      const startMillis = getDayobsStartUTC(search.startDayobs.toString());
      const endMillis = getDayobsEndUTC(search.endDayobs.toString());
      return {
        ...search,
        startTime: Math.max(search.startTime, startMillis),
        endTime: Math.min(search.endTime, endMillis),
      };
    });

// Validate schema object for general use
export const searchParamsSchema = applyCommonValidations(
  baseSearchParamsSchema,
);

// Convert table columns to url filter keys
const columns = [];
for (const cols of Object.values(dataLogColumns)) {
  if (Array.isArray(cols)) columns.push(...cols);
}
const arrayKeys = columns.map((col) => col.meta?.urlParam).filter(Boolean);

// Get schema for multi-valued search fields
const filtersShape = Object.fromEntries(
  arrayKeys.map((key) => [key, z.string().array().optional()]),
);

// Extend base schema object for data log page with filter fields
export const dataLogSearchSchema = applyCommonValidations(
  baseSearchParamsSchema.extend(filtersShape),
);

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Digest,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const dataLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-log",
  component: DataLog,
  validateSearch: dataLogSearchSchema,
  errorComponent: SearchParamErrorComponent,
});

const contextFeedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/context-feed",
  component: ContextFeed,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const plotsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plots",
  component: Plots,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const visitmapsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/visit-maps",
  component: VisitMaps,
  validateSearch: searchParamsSchema,
  errorComponent: SearchParamErrorComponent,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    dashboardRoute,
    dataLogRoute,
    contextFeedRoute,
    plotsRoute,
    visitmapsRoute,
  ]),
  basepath: "/nightlydigest",

  // Converts search object to query string
  stringifySearch: (searchObj) => {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(searchObj)) {
      if (Array.isArray(value)) {
        for (const val of value) {
          searchParams.append(key, val);
        }
      } else if (value != null && value !== "") {
        searchParams.set(key, value);
      }
    }

    const final = `?${searchParams.toString()}`;
    return final;
  },

  // Parses query string into object
  // Coerces single values to arrays for specified keys
  parseSearch: (searchStr) => {
    const raw = new URLSearchParams(searchStr);
    const parsed = Object.fromEntries(raw.entries());

    // Keys to be parsed as arrays
    for (const key of arrayKeys) {
      const values = raw.getAll(key);
      if (values.length > 0) {
        parsed[key] = values;
      }
    }

    return parsed;
  },
});

export default router;
