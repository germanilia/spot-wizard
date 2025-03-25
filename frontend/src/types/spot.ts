export interface InstanceType {
  emr: boolean;
  cores: number;
  ram_gb: number;
}

export interface Range {
  index: number;
  label: string;
  dots: number;
  max: number;
}

export interface SpotMetrics {
  s: number;  // Savings over on-demand (percentage)
  r: number;  // Interruption frequency rating (0-4)
  interruptionFrequency: string; // Frequency of interruption (e.g. "5-10%")
}

export interface InstanceSpotData {
  Linux: Record<string, SpotMetrics>;
  Windows?: Record<string, SpotMetrics>;
}

export interface SpotData {
  instance_types: Record<string, InstanceType>;
  ranges: Range[];
  spot_advisor: Record<string, InstanceSpotData>;
}

export interface EC2PricingRate {
  price: string;
  unit: string;
  description: string;
}

export interface EC2PricingData {
  regions: Record<string, {
    [instanceType: string]: EC2PricingRate;
  }>;
}

export interface PricingConfig {
  region: string;
  operatingSystem: 'Linux' | 'Windows';
}

export interface InstanceCost {
  onDemand: number;
  spot: number;
  savings: number;
  currency: string;
  unit: string;
  isSpotAvailable: boolean;
}

export type RegionCode = 
  | 'us-east-1'
  | 'us-east-2'
  | 'us-west-1'
  | 'us-west-2'
  | 'af-south-1'
  | 'ap-east-1'
  | 'ap-south-1'
  | 'ap-south-2'
  | 'ap-southeast-1'
  | 'ap-southeast-2'
  | 'ap-southeast-3'
  | 'ap-southeast-4'
  | 'ap-southeast-6'
  | 'ap-southeast-7'
  | 'ap-northeast-1'
  | 'ap-northeast-2'
  | 'ap-northeast-3'
  | 'ca-central-1'
  | 'ca-west-1'
  | 'eu-central-1'
  | 'eu-central-2'
  | 'eu-west-1'
  | 'eu-west-2'
  | 'eu-west-3'
  | 'eu-south-1'
  | 'eu-south-2'
  | 'eu-north-1'
  | 'il-central-1'
  | 'me-central-1'
  | 'me-south-1'
  | 'sa-east-1'
  | 'mx-central-1';

export interface RegionMetrics {
  region: string | RegionCode;
  metrics: SpotMetrics;
  windowsMetrics?: SpotMetrics;
  cost: InstanceCost;
  windowsCost?: InstanceCost;
  spotUnavailable?: boolean;
}

export interface InstanceAnalysis {
  instanceType: string;
  specs: InstanceType;
  spotMetrics: readonly {
    region: string;
    metrics: SpotMetrics;
    cost: InstanceCost;
    windowsMetrics?: SpotMetrics;
    windowsCost?: InstanceCost;
    spotUnavailable?: boolean;
  }[];
  totalCost: InstanceCost;
  averageScore: number;
  averageRating: number;
  availableRegionsCount: number;
  totalRegionsCount: number;
}

export interface RegionInstance {
  instanceType: string;
  metrics: SpotMetrics;
  cost: InstanceCost;
  windowsMetrics?: SpotMetrics;
  windowsCost?: InstanceCost;
}

export interface RegionAnalysis {
  region: RegionCode;
  instances: readonly RegionInstance[];
  totalCost: InstanceCost;
}

export interface StackAnalysis {
  name: string;
  instances: readonly string[];
  regions: readonly string[];
  totalCost: InstanceCost;
  averageScore: number;
  averageRating: number;
}

export interface RegionSpotMetrics {
  region: RegionCode;
  metrics: SpotMetrics;
  cost: InstanceCost;
  windowsCost?: InstanceCost;
}

export interface SpotAdvisorData {
  spot_advisor: {
    [region: string]: {
      Linux: {
        [instanceType: string]: SpotMetrics;
      };
      Windows?: {
        [instanceType: string]: SpotMetrics;
      };
    };
  };
  instance_types: {
    [instanceType: string]: InstanceSpecs;
  };
} 