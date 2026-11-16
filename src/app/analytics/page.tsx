import type { Metadata } from 'next';
import { PlannedScreen } from '@/components/planned-screen';

export const metadata: Metadata = {
  title: 'Analytics',
};

export default function AnalyticsPage() {
  return (
    <PlannedScreen
      eyebrow="Evaluation"
      title="Analytics"
      lede="The comparison the project exists to make: baseline and scheduler on identical inputs, a perfect-foresight upper bound, and anomaly records with their evidence attached."
      phase="Phase 07"
      refs={['FR-EMS-09', 'FR-EMS-11', 'FR-ANM-03']}
      items={[
        {
          title: 'Paired runs',
          detail:
            'Baseline and scheduler share the scenario, weather, load trace, initial SOC and seed. The runner refuses mismatched inputs instead of producing an unpaired number.',
          refs: ['FR-EMS-09', 'DEC-013'],
        },
        {
          title: 'Upper bound',
          detail:
            'A perfect-foresight oracle runs the same scenarios, so any reported gain is measured against a reachable limit rather than against nothing.',
          refs: ['FR-EMS-11'],
        },
        {
          title: 'Anomaly records',
          detail:
            'PV underproduction, load spikes and SOC inconsistencies carry severity, an evidence window, an expected range and a false-positive caveat. Detection is measured against injected faults.',
          refs: ['FR-ANM-01', 'FR-ANM-02', 'FR-ANM-03'],
        },
      ]}
    />
  );
}
