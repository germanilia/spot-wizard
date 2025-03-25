import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const regionNameMap: Record<string, string> = {
  'eu-central-1': 'Europe (Frankfurt)',
  'eu-central-2': 'Europe (Zurich)',
  'eu-west-1': 'Europe (Ireland)',
  'eu-west-2': 'Europe (London)',
  'eu-west-3': 'Europe (Paris)',
  'eu-south-1': 'Europe (Milan)',
  'eu-south-2': 'Europe (Spain)',
  'eu-north-1': 'Europe (Stockholm)',
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-1': 'US West (N. California)',
  'us-west-2': 'US West (Oregon)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'ap-south-2': 'Asia Pacific (Hyderabad)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-southeast-3': 'Asia Pacific (Jakarta)',
  'ap-southeast-4': 'Asia Pacific (Melbourne)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-northeast-3': 'Asia Pacific (Osaka)',
  'ap-east-1': 'Asia Pacific (Hong Kong)',
  'ca-central-1': 'Canada (Central)',
  'sa-east-1': 'South America (São Paulo)',
  'me-south-1': 'Middle East (Bahrain)',
  'me-central-1': 'Middle East (UAE)',
  'af-south-1': 'Africa (Cape Town)',
};

export function formatRegionName(regionCode: string): string {
  return regionNameMap[regionCode] || regionCode;
}

export function getRegionCode(friendlyName: string): string {
  const entry = Object.entries(regionNameMap).find(([_, name]) => name === friendlyName);
  return entry ? entry[0] : friendlyName;
}

export function formatInstanceSpecs(cores: number, ramGb: number): string {
  return `${cores} vCPU${cores > 1 ? 's' : ''}, ${ramGb} GB RAM`;
}
