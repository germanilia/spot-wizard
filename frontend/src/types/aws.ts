export interface AWSCredentials {
  access_key: string;
  secret_key: string;
  regions: string[];
}

export interface EC2Instance {
  instance_id: string;
  instance_type: string;
  region: string;
  state: string;
  private_ip?: string;
  public_ip?: string;
  platform: string;
}

export interface EC2RegionSummary {
  region: string;
  instance_types: Record<string, number>; // Map of instance_type to count
}

export interface EC2SummaryResponse {
  [region: string]: EC2Instance[];
} 