import { TrainingHubNav } from '@/components/portal/training-hub-nav'
import { Omni7000Simulator } from '@/components/portal/omni7000/Omni7000Simulator'

export const metadata = {
  title: 'OMNI 7000 Simulator',
}

export default function SimulatorPage() {
  return (
    <div className="mx-auto w-full max-w-7xl py-6">
      <TrainingHubNav activeTab="simulator" />
      <Omni7000Simulator />
    </div>
  )
}
