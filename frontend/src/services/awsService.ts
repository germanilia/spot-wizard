import { AWSCredentials, EC2RegionSummary, EC2SummaryResponse } from '../types/aws';
import { toast } from '../hooks/use-toast';

const API_BASE_URL = '/api/aws';

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
}

export const awsService = new AWSService(); 