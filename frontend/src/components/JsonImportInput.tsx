import { useSnapshot } from 'valtio';
import { useState } from 'react';
import { awsStore } from '../store/awsStore';
import { spotStore, actions } from '../store/spotStore';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { RegionCode } from '../types/spot';
import { awsService } from '../services/awsService';

interface JsonImportInputProps {
  onImportComplete?: () => void;
}

export function JsonImportInput({ onImportComplete }: JsonImportInputProps) {
  const awsState = useSnapshot(awsStore);
  const spotState = useSnapshot(spotStore);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          const result = await awsService.importFromJson(jsonData);

          // Set the regions in the store
          const regions = result.regions.map(region => {
            // Map AWS region names to region codes
            const regionMap: Record<string, RegionCode> = {
              'US West (Oregon)': 'us-west-2',
              'US East (N. Virginia)': 'us-east-1',
              'US East (Ohio)': 'us-east-2',
              'US West (N. California)': 'us-west-1',
              'US West (N. California)': 'us-west-1',
              'Asia Pacific (Tokyo)': 'ap-northeast-1',
              'Asia Pacific (Seoul)': 'ap-northeast-2',
              'Asia Pacific (Singapore)': 'ap-southeast-1',
              'Asia Pacific (Sydney)': 'ap-southeast-2',
              'Europe (Ireland)': 'eu-west-2',
              'Europe (Frankfurt)': 'eu-central-1',
              'Europe (Paris)': 'eu-west-3',
              'Europe (Stockholm)': 'eu-north-1',
              'Europe (Milan)': 'eu-south-1',
              'Europe (London)': 'eu-west-2',
              'South America (São Paulo)': 'sa-east-1',
              'Africa (Cape Town)': 'af-south-1',
              'Middle East (Bahrain)': 'me-south-1',
            };
            return regionMap[region] || region;
          });

          // Set selected regions
          actions.setSelectedRegions(regions);

          // Collect all instance types
          const instanceTypes = new Set<string>();
          Object.values(result.instances).forEach(regionInstances => {
            regionInstances.forEach(instance => {
              instanceTypes.add(instance.instance_type);
            });
          });

          // Set selected instances
          actions.setSelectedInstances(Array.from(instanceTypes));

          // Set instance quantities
          actions.clearInstanceQuantities();
          Object.entries(result.instances).forEach(([region, instances]) => {
            instances.forEach(instance => {
              actions.updateInstanceQuantity(
                instance.instance_type,
                region as RegionCode,
                instance.platform,
                instance.quantity
              );
            });
          });

          setIsSuccess(true);

          if (onImportComplete) {
            onImportComplete();
          }
        } catch (error) {
          console.error('Error processing JSON:', error);
          toast({
            title: 'Error',
            description: 'Failed to process the JSON file. Please check the format.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to read the file.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import from JSON</CardTitle>
        <CardDescription>
          Upload an AWS Pricing Calculator JSON file to import your EC2 instances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="json-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-gray-500" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">AWS Pricing Calculator JSON file</p>
            </div>
            <input
              id="json-upload"
              type="file"
              className="hidden"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>
        </div>

        {isSuccess && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Successfully imported instances from JSON file
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => document.getElementById('json-upload')?.click()}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Importing...' : 'Import from JSON'}
        </Button>
      </CardFooter>
    </Card>
  );
} 