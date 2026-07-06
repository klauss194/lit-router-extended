import { waitUntil } from "@open-wc/testing";

/**
 * Shared async wait helpers for router tests.
 */
export const nextTick = () => new Promise((r) => setTimeout(r, 0));

export const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export const flushNavigation = async (el) => {
  await nextTick();
  await nextTick();
  await el.updateComplete;
};

export const sleep = async (t) => new Promise((r) => setTimeout(r, t));

export const waitForUrl = (pathname, timeout = 2000) =>
  waitUntil(
    () => window.location.pathname === pathname,
    `URL should be "${pathname}" but was "${window.location.pathname}"`,
    { timeout },
  );

export const waitForHash = (hash, timeout = 2000) =>
  waitUntil(
    () => window.location.hash === hash,
    `hash should be "${hash}" but was "${window.location.hash}"`,
    { timeout },
  );

export const waitForElement = (el, selector, timeout = 2000) =>
  waitUntil(
    () => el.querySelector(selector) !== null,
    `Element "${selector}" should exist`,
    { timeout },
  );