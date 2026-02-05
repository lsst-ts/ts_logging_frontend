import {
  createRootRoute,
  createRouter,
  createRoute,
  redirect,
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
import { contextFeedColumns } from "@/components/ContextFeedColumns";
import {
  isDateInRetentionRange,
  getAvailableDayObsRange,
} from "./utils/retentionPolicyUtils";
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

const applyDateValidation = (schema) => {
  return schema.refine(
    (obj) =>
      isDateInRetentionRange(obj.startDayobs) &&
      isDateInRetentionRange(obj.endDayobs),
    () => {
      const range = getAvailableDayObsRange();
      if (!range.retentionDays)
        return {
          message: `Date range must be before current dayObs ${range.max}).`,
          path: ["startDayobs"],
        };

      return {
        message: `Date range must be within the last ${range.retentionDays} days (${range.min} to ${range.max}).`,
        path: ["startDayobs"],
      };
    },
  );
};
// Apply common validations and transformations to search params schemas
const applyCommonValidations = (schema) =>
  schema
    .refine((obj) => obj.startDayobs <= obj.endDayobs, {
      message: "startDayobs must be before or equal to endDayobs.",
      path: ["startDayobs"],
    })
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
  applyDateValidation(baseSearchParamsSchema),
);

// Extend search schema object for individual pages

// Helper to extract urlParam keys from column definitions
function getUrlParamKeys(columns) {
  const keys = [];
  const flatten = (cols) => {
    for (const col of cols) {
      if (col.columns) {
        flatten(col.columns);
      } else if (col.meta?.urlParam) {
        keys.push(col.meta.urlParam);
      }
    }
  };
  if (Array.isArray(columns)) {
    flatten(columns);
  } else {
    // Handle object of column arrays (like dataLogColumns keyed by telescope)
    for (const cols of Object.values(columns)) {
      if (Array.isArray(cols)) flatten(cols);
    }
  }
  return keys;
}

// Helper to create a schema extension with array filter fields
function createFilterSchema(urlParamKeys) {
  const filtersShape = Object.fromEntries(
    urlParamKeys.map((key) => [key, z.string().array().optional()]),
  );
  return filtersShape;
}

// Extract URL param keys for each page
const dataLogUrlParams = getUrlParamKeys(dataLogColumns);
const contextFeedUrlParams = getUrlParamKeys(contextFeedColumns);

// All array keys (for router parseSearch)
const arrayKeys = [...new Set([...dataLogUrlParams, ...contextFeedUrlParams])];

// Create page-specific schemas with their filter fields
export const dataLogSearchSchema = applyCommonValidations(
  applyDateValidation(
    baseSearchParamsSchema.extend(createFilterSchema(dataLogUrlParams)),
  ),
);

export const contextFeedSearchSchema = applyCommonValidations(
  applyDateValidation(
    baseSearchParamsSchema.extend(createFilterSchema(contextFeedUrlParams)),
  ),
);

// Helper to create a beforeLoad that strips unknown search params
// Redirects with only the allowed params if extra keys are present
function stripUnknownParams(allowedKeys) {
  return ({ search }) => {
    const currentKeys = Object.keys(search);
    const hasExtraKeys = currentKeys.some((k) => !allowedKeys.includes(k));
    if (hasExtraKeys) {
      const filteredSearch = Object.fromEntries(
        Object.entries(search).filter(([k]) => allowedKeys.includes(k)),
      );
      throw redirect({ search: filteredSearch, replace: true });
    }
  };
}

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Digest,
  validateSearch: searchParamsSchema,
  beforeLoad: stripUnknownParams(GLOBAL_SEARCH_PARAMS),
  errorComponent: SearchParamErrorComponent,
});

const dataLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-log",
  component: DataLog,
  validateSearch: dataLogSearchSchema,
  beforeLoad: stripUnknownParams([
    ...GLOBAL_SEARCH_PARAMS,
    ...dataLogUrlParams,
  ]),
  errorComponent: SearchParamErrorComponent,
});

const contextFeedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/context-feed",
  component: ContextFeed,
  validateSearch: contextFeedSearchSchema,
  beforeLoad: stripUnknownParams([
    ...GLOBAL_SEARCH_PARAMS,
    ...contextFeedUrlParams,
  ]),
  errorComponent: SearchParamErrorComponent,
});

const plotsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plots",
  component: Plots,
  validateSearch: searchParamsSchema,
  beforeLoad: stripUnknownParams(GLOBAL_SEARCH_PARAMS),
  errorComponent: SearchParamErrorComponent,
});

const visitmapsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/visit-maps",
  component: VisitMaps,
  validateSearch: searchParamsSchema,
  beforeLoad: stripUnknownParams(GLOBAL_SEARCH_PARAMS),
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
        if (value.length === 0) {
          // Preserve empty arrays as empty param (e.g., &event_type=)
          searchParams.set(key, "");
        } else {
          for (const val of value) {
            searchParams.append(key, val);
          }
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
      if (raw.has(key)) {
        // Filter out empty strings (from empty array serialization)
        const values = raw.getAll(key).filter((v) => v !== "");
        parsed[key] = values;
      }
    }

    return parsed;
  },
});

export default router;
