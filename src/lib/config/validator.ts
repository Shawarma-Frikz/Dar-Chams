/**
 * The compiled scenario contract.
 *
 * The schema is imported as data, not copied: `scenarios/scenario.schema.json`
 * stays the single description of what a scenario may contain, and this module
 * is the one place that turns it into a validator the application can call.
 */

import scenarioSchema from '../../../scenarios/scenario.schema.json' with { type: 'json' };
import { createScenarioValidator } from '@helios/engine';

export const SCENARIO_SCHEMA_SOURCE = 'scenarios/scenario.schema.json';

export const scenarioValidator = createScenarioValidator(scenarioSchema);
