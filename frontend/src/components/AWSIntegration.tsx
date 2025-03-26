import { AWSCredentialsInput } from './AWSCredentialsInput';
import { actions } from '../store/spotStore';

export function AWSIntegration() {
  const handleImportComplete = () => {
    // Auto-trigger analysis when import is complete
    actions.analyzeInstances();
  };

  return (
    <div>
      <AWSCredentialsInput onImportComplete={handleImportComplete} />
    </div>
  );
} 