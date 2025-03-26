import { useSnapshot } from 'valtio';
import { useState } from 'react';
import { awsStore } from '../store/awsStore';
import { spotStore, actions } from '../store/spotStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { RegionCode } from '../types/spot';

interface AWSCredentialsInputProps {
  onImportComplete?: () => void;
}

export function AWSCredentialsInput({ onImportComplete }: AWSCredentialsInputProps) {
  const awsState = useSnapshot(awsStore);
  const spotState = useSnapshot(spotStore);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAccessKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    awsStore.setCredentials({ access_key: e.target.value });
  };

  const handleSecretKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    awsStore.setCredentials({ secret_key: e.target.value });
  };

  const handleRegionChange = (regions: RegionCode[]) => {
    awsStore.setCredentials({ regions });
    // Also set these as selected regions in spot store
    actions.setSelectedRegions(regions);
  };

  const handleFetchInstances = async () => {
    setIsSuccess(false);
    await awsStore.fetchEC2Instances();
    
    if (!awsState.error && Object.keys(awsStore.instances).length > 0) {
      setIsSuccess(true);
      
      // Collect all instance types that were found
      const instanceTypes = new Set<string>();
      Object.values(awsStore.instances).forEach(regionInstances => {
        regionInstances.forEach(instance => {
          instanceTypes.add(instance.instance_type);
        });
      });
      
      const foundInstanceTypes = Array.from(instanceTypes);
      console.log('Found instance types:', foundInstanceTypes);
      
      // Clear existing quantities before setting new ones
      actions.clearInstanceQuantities();
      
      // First set the selected regions in the spot store
      const selectedRegions = awsState.credentials.regions as RegionCode[];
      actions.setSelectedRegions(selectedRegions);
      
      // Then set the instance types in the spot store
      actions.setSelectedInstances(foundInstanceTypes);
      
      // First, group instances by region, type, and platform
      const instanceCountByRegionTypeOS: Record<string, Record<string, Record<string, number>>> = {};
      
      // Process all instances and count them by region, type, and OS
      Object.entries(awsStore.instances).forEach(([region, instances]) => {
        instanceCountByRegionTypeOS[region] = {};
        
        instances.forEach(instance => {
          const instanceType = instance.instance_type;
          const os = instance.platform === 'Windows' ? 'Windows' : 'Linux';
          
          if (!instanceCountByRegionTypeOS[region][instanceType]) {
            instanceCountByRegionTypeOS[region][instanceType] = { 'Linux': 0, 'Windows': 0 };
          }
          
          instanceCountByRegionTypeOS[region][instanceType][os]++;
        });
      });
      
      // Now set instance quantities based on actual OS
      let totalQuantitiesSet = 0;
      
      Object.entries(instanceCountByRegionTypeOS).forEach(([region, instanceTypes]) => {
        Object.entries(instanceTypes).forEach(([instanceType, osCount]) => {
          // Set Linux count
          if (osCount['Linux'] > 0) {
            actions.updateInstanceQuantity(
              instanceType,
              region as RegionCode,
              'Linux',
              osCount['Linux']
            );
            totalQuantitiesSet++;
          }
          
          // Set Windows count
          if (osCount['Windows'] > 0) {
            actions.updateInstanceQuantity(
              instanceType,
              region as RegionCode,
              'Windows',
              osCount['Windows']
            );
            totalQuantitiesSet++;
          }
        });
      });
      
      console.log(`Set ${totalQuantitiesSet} quantity configurations across all regions and OSes`);
      
      // Force update the quantities in the store by setting them directly
      spotStore.instanceQuantities = [...spotStore.instanceQuantities];
      
      // Run analysis if requested
      if (onImportComplete) {
        onImportComplete();
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import from AWS</CardTitle>
        <CardDescription>
          Enter your AWS credentials to import your existing EC2 instances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="access-key">AWS Access Key</Label>
          <Input
            id="access-key"
            value={awsState.credentials.access_key}
            onChange={handleAccessKeyChange}
            placeholder="Enter your AWS access key"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="secret-key">AWS Secret Key</Label>
          <Input
            id="secret-key"
            type="password"
            value={awsState.credentials.secret_key}
            onChange={handleSecretKeyChange}
            placeholder="Enter your AWS secret key"
          />
        </div>
        <div className="grid gap-2">
          <Label>Select Regions to Scan</Label>
          <div className="grid grid-cols-3 gap-2">
            {spotState.availableRegions.map((region) => (
              <div key={region} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`region-${region}`}
                  checked={awsState.credentials.regions.includes(region)}
                  onChange={(e) => {
                    const regions = e.target.checked
                      ? [...awsState.credentials.regions, region]
                      : awsState.credentials.regions.filter((r) => r !== region);
                    handleRegionChange(regions as RegionCode[]);
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor={`region-${region}`} className="text-sm">
                  {region}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        {awsState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{awsState.error}</AlertDescription>
          </Alert>
        )}
        
        {isSuccess && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Successfully imported {Object.values(awsStore.instances).flat().length} instances from AWS
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleFetchInstances} 
          disabled={awsState.isLoading || !awsState.credentials.access_key || !awsState.credentials.secret_key || awsState.credentials.regions.length === 0}
          className="w-full"
        >
          {awsState.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {awsState.isLoading ? 'Importing...' : 'Import Instances from AWS'}
        </Button>
      </CardFooter>
    </Card>
  );
} 