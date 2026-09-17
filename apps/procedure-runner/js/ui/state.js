/**
 * Single shared mutable store for the running session, mirroring the plain
 * globals the original single-file app used (steps/currentIndex/etc). Every
 * ui/*.js module reads and writes through this one object instead of each
 * keeping its own copy, so there is exactly one source of truth.
 */
import { getOperatorName } from '../../../../shared/js/operator.js';

export const state = {
  steps: [],
  currentIndex: 0,
  sourceName: '',
  username: getOperatorName()
};
