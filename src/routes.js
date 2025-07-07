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

const rootRoute = createRootRoute({
  component: Layout,
});

// const dateFormatRegex = /^\d{8}$/; // yyyyMMdd
// const dateFormatInt = z.number().int().gte(10000101).lte(99991231);

const searchParamsSchema = z.object({
  noOfNights: z.number().int().min(1).max(30).default(1),
  dayObs: z
    .number()
    .int()
    .positive()
    .gte(10000101)
    .lte(99991231)
    .default(() => {
      // Default to yesterday in yyyyMMdd format
      return parseInt(DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd"));
    }),
  // dayObs: z.coerce.date().default(() => new Date(Date.now() - 24 * 60 * 60 * 1000)), // Default to yesterday
  // dayObs: dateFormatInt.transform((val) => {
  //   const valStr = val.toString();
  //   const y = valStr.slice(0, 4);
  //   const m = valStr.slice(4, 6);
  //   const d = valStr.slice(6);
  //   return new Date(`${y}-${m}-${d}`);
  // }),
  instrument: z.string().default("LSSTCam"),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Summary,
  validateSearch: searchParamsSchema,
});

const dataLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-log",
  component: DataLog,
  validateSearch: searchParamsSchema,
});

const contextFeedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/context-feed",
  component: ContextFeed,
  validateSearch: searchParamsSchema,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    dashboardRoute,
    dataLogRoute,
    contextFeedRoute,
  ]),
  // context: {
  //   params: {
  //     noOfNights: 1,
  //     dayobs: new Date(),
  //     instrument: "LSSTCam",
  //   },
  // },
  basepath: "/nightlydigest",
});

export default router;
