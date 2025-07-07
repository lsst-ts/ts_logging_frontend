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

const searchParamsSchema = z.object({
  startDayobs: z
    .number()
    .int()
    .positive()
    .gte(10000101)
    .lte(99991231)
    .default(() => {
      // Default to yesterday in yyyyMMdd format
      return parseInt(DateTime.utc().minus({ days: 2 }).toFormat("yyyyMMdd"));
    }),
  endDayobs: z
    .number()
    .int()
    .positive()
    .gte(10000101)
    .lte(99991231)
    .default(() => {
      // Default to yesterday in yyyyMMdd format
      return parseInt(DateTime.utc().minus({ days: 1 }).toFormat("yyyyMMdd"));
    }),
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
  basepath: "/nightlydigest",
});

export default router;
