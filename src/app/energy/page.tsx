import type { Metadata } from 'next';
import { PlannedScreen } from '@/components/planned-screen';

export const metadata: Metadata = {
  title: 'Energy',
};

export default function EnergyPage() {
  return (
    <PlannedScreen
      eyebrow="Simulation output"
      title="Energy"
      lede="Interval series for generation, storage, grid exchange and appliances, with each loss term kept separate and the energy balance closing at every simulated step."
      phase="Phase 09"
      refs={['FR-SIM-04', 'FR-PV-05', 'FR-UX-03']}
      items={[
        {
          title: 'Interval series',
          detail:
            '96 steps per simulated day at the default 15-minute timestep, with power in W and interval energy in Wh kept distinct. Every point is traceable to the run that produced it.',
          refs: ['FR-SIM-02', 'FR-SIM-03'],
        },
        {
          title: 'Loss breakdown',
          detail:
            'Soiling, shading, mismatch, availability, inverter conversion and clipping are configured separately and reported separately, so a yield gap can be attributed rather than guessed.',
          refs: ['FR-PV-05'],
        },
        {
          title: 'Balance closure',
          detail:
            'PV, import, discharge, load, charge, export and losses reconcile to within 1 × 10⁻⁶ kWh per step. A chart that does not reconcile with the stored intervals is a defect, not a rounding choice.',
          refs: ['FR-SIM-04', 'FR-UX-03'],
        },
      ]}
    />
  );
}
