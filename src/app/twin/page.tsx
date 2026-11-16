import type { Metadata } from 'next';
import { PlannedScreen } from '@/components/planned-screen';

export const metadata: Metadata = {
  title: 'System twin',
};

export default function TwinPage() {
  return (
    <PlannedScreen
      eyebrow="Installation"
      title="System twin"
      lede="The same installation seen twice: a 2D system map that always works, and a low-poly 3D cutaway built from primitives. Both read one typed view model and expose the same states and controls."
      phase="Phase 08"
      refs={['FR-TWN-01', 'FR-TWN-03', 'FR-UX-10']}
      items={[
        {
          title: '2D system map',
          detail:
            'PV array, inverter, battery, grid entry and each appliance as typed entities, with flows sized by actual power. The map is authoritative and must carry every critical state and control.',
          refs: ['FR-UX-10', 'FR-TWN-02'],
        },
        {
          title: '3D cutaway',
          detail:
            'Low-poly geometry built from primitives, one shadow-casting light, on-demand frames and a capped pixel ratio. Energy logic never lives in a mesh event handler; disabling 3D leaves every other function working.',
          refs: ['FR-TWN-01', 'FR-TWN-05'],
        },
        {
          title: 'Selection stays in sync',
          detail:
            'Selecting a component in either view opens the same detail panel, on desktop and mobile, without one view becoming a second source of truth.',
          refs: ['FR-TWN-03'],
        },
      ]}
    />
  );
}
