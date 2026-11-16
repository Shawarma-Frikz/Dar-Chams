import type { Metadata } from 'next';
import { PlannedScreen } from '@/components/planned-screen';

export const metadata: Metadata = {
  title: 'Scenarios',
};

export default function ScenariosPage() {
  return (
    <PlannedScreen
      eyebrow="Configuration"
      title="Scenarios"
      lede="One validated JSON file per scenario, and a run manifest that names the engine version, scenario hash, seed and data provenance behind every result."
      phase="Phase 02"
      refs={['FR-SIM-10', 'NFR-03', 'FR-UX-06']}
      items={[
        {
          title: 'One file, no hidden defaults',
          detail:
            'Whole-file composition, explicit required fields and strict validation before a run starts. A rejected scenario names the offending field and never falls back to a default.',
          refs: ['FR-SIM-10', 'DEC-021'],
        },
        {
          title: 'Run manifest',
          detail:
            'Engine version, scenario hash, seed and data provenance are recorded per run, so a result can be reproduced and cited rather than described.',
          refs: ['NFR-03', 'DEC-012'],
        },
        {
          title: 'Export and print',
          detail:
            'Runs and comparisons export to CSV and JSON, and a printable view stays traceable to scenario identifier, engine version and seed.',
          refs: ['FR-UX-08'],
        },
      ]}
    />
  );
}
