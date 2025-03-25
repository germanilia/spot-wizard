import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InstanceTypeInput } from './components/InstanceTypeInput';
import { RegionSelector } from './components/RegionSelector';
import { InstanceAnalysis } from './components/InstanceAnalysis';
import { actions } from './store/spotStore';
import { useSnapshot } from 'valtio';
import { spotStore } from './store/spotStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';

function App() {
  const { selectedInstances, selectedRegions } = useSnapshot(spotStore);
  const showError = selectedInstances.length === 0 || selectedRegions.length === 0;

  useEffect(() => {
    actions.initialize();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <InstanceAnalysis />
    </div>
  );
}

export default App; 