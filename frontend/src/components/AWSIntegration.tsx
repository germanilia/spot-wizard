import { useSnapshot } from 'valtio';
import { spotStore, actions } from '../store/spotStore';
import { AWSCredentialsInput } from './AWSCredentialsInput';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

export function AWSIntegration() {
  const spotState = useSnapshot(spotStore);

  const handleAnalyze = () => {
    actions.analyzeInstances();
  };

  const handleImportComplete = () => {
    // Auto-trigger analysis when import is complete
    actions.analyzeInstances();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <AWSCredentialsInput onImportComplete={handleImportComplete} />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>AWS Integration</CardTitle>
              <CardDescription>
                Import your EC2 instances from AWS and analyze them for spot instance opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Enter your AWS credentials to import your existing EC2 instances. 
                We'll analyze them for potential cost savings with spot instances.
              </p>
              <p>
                Your credentials are only used to fetch instance data and are never stored.
                We recommend using a read-only IAM user for this purpose.
              </p>
              
              {spotState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{spotState.error}</AlertDescription>
                </Alert>
              )}
              
              {spotState.selectedInstances.length > 0 && spotState.selectedRegions.length > 0 && (
                <div className="pt-4">
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={spotState.isLoading}
                    className="w-full"
                  >
                    {spotState.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {spotState.isLoading ? 'Analyzing...' : 'Analyze Selected Instances'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 