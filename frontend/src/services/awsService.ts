import { AWSCredentials, EC2RegionSummary, EC2SummaryResponse } from '../types/aws';
import { toast } from '../hooks/use-toast';

const API_BASE_URL = '/api/aws';

interface EC2InstanceFromJson {
  'Service Name': string;
  Region: string;
  Properties: {
    'Operating system': string;
    'Advance EC2 instance': string;
    'Workload': string;
  };
}

interface JsonImportResponse {
  instances: Record<string, Array<{
    instance_type: string;
    platform: string;
    quantity: number;
  }>>;
  regions: string[];
}

class AWSService {
  async fetchEC2Instances(credentials: AWSCredentials): Promise<EC2SummaryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/ec2-instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch EC2 instances');
      }

      return await response.json();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch EC2 instances',
        variant: 'destructive',
      });
      throw error;
    }
  }

  async fetchEC2Summary(credentials: AWSCredentials): Promise<EC2RegionSummary[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/ec2-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch EC2 summary');
      }

      return await response.json();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch EC2 summary',
        variant: 'destructive',
      });
      throw error;
    }
  }

  async importFromJson(jsonData: any): Promise<JsonImportResponse> {
    try {
      const ec2Instances = jsonData.Groups.Services.filter(
        (service: EC2InstanceFromJson) => service['Service Name'].trim() === 'Amazon EC2'
      );

      const instances: Record<string, Array<{
        instance_type: string;
        platform: string;
        quantity: number;
      }>> = {};

      const regions = new Set<string>();

      ec2Instances.forEach((instance: EC2InstanceFromJson) => {
        const region = instance.Region;
        regions.add(region);

        if (!instances[region]) {
          instances[region] = [];
        }

        // Extract quantity from workload string (e.g., "Consistent, Number of instances: 1")
        const quantityMatch = instance.Properties.Workload.match(/Number of instances: (\d+)/);
        const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

        instances[region].push({
          instance_type: instance.Properties['Advance EC2 instance'],
          platform: instance.Properties['Operating system'],
          quantity,
        });
      });

      return {
        instances,
        regions: Array.from(regions),
      };
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import JSON data',
        variant: 'destructive',
      });
      throw error;
    }
  }
}

export const awsService = new AWSService(); 