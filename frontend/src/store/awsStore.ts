import { proxy } from 'valtio';
import { AWSCredentials, EC2Instance, EC2RegionSummary } from '../types/aws';
import { awsService } from '../services/awsService';

interface AWSStore {
  credentials: AWSCredentials;
  isLoading: boolean;
  instances: Record<string, EC2Instance[]>;
  instanceSummary: EC2RegionSummary[];
  error: string | null;
  setCredentials: (credentials: Partial<AWSCredentials>) => void;
  fetchEC2Instances: () => Promise<void>;
}

export const awsStore = proxy<AWSStore>({
  credentials: {
    access_key: '',
    secret_key: '',
    regions: []
  },
  isLoading: false,
  instances: {},
  instanceSummary: [],
  error: null,

  setCredentials(credentials) {
    this.credentials = { ...this.credentials, ...credentials };
  },

  async fetchEC2Instances() {
    if (!this.credentials.access_key || !this.credentials.secret_key || this.credentials.regions.length === 0) {
      this.error = 'Please provide AWS credentials and select at least one region';
      return;
    }

    this.isLoading = true;
    this.error = null;
    
    try {
      const instancesData = await awsService.fetchEC2Instances(this.credentials);
      this.instances = instancesData;
      
      const summaryData = await awsService.fetchEC2Summary(this.credentials);
      this.instanceSummary = summaryData;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'An error occurred fetching EC2 instances';
    } finally {
      this.isLoading = false;
    }
  }
}); 