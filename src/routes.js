import {
  createRootRoute,
  createRouter,
  createRoute,
} from "@tanstack/react-router";
import Layout from "./pages/layout";
import DataLog from "./pages/data-log";
import ContextFeed from "./pages/context-feed";

const rootRoute = createRootRoute({
  component: Layout,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ContextFeed,
});

const dataLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-log",
  component: DataLog,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([dashboardRoute, dataLogRoute]),
  context: {
    params: {
      noOfNights: 1,
      dayobs: new Date(),
      instrument: "LSSTCam",
      // nightHours: 0.0,
      // weatherLoss: 0.0,
      // faultLoss: 0.0,
      // exposureFields: [],
      // exposureCount: 0,
      // sumExpTime: 0.0,
      // flags: [],
    },
  },
  basepath: "/nightlydigest",
});

export default router;
