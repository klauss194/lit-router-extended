import { Navigation } from "./Navigation.js";
import { RouteNotFoundError, InvalidNavigationError } from "./errors/index.js";
import { Router } from "./Router.js";
import { Routes } from "./Routes.js";
import { Route } from "./Route.js";
import { RouterNavigationErrorEvent } from "./RoutesEvents.js";

export {
  RouterNavigationErrorEvent,
  InvalidNavigationError,
  RouteNotFoundError,
  Navigation,
  Router,
  Routes,
  Route,
};

export default Router;
