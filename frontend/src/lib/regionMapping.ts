import { RegionCode } from '@/types/spot';

export interface RegionInfo {
  code: RegionCode;
  name: string;
  spotAdvisorCode: string;
}

export const regionMap: Record<RegionCode, RegionInfo> = {
  'us-east-1': {
    code: 'us-east-1',
    name: 'US East (N. Virginia)',
    spotAdvisorCode: 'us-east-1'
  },
  'us-east-2': {
    code: 'us-east-2',
    name: 'US East (Ohio)',
    spotAdvisorCode: 'us-east-2'
  },
  'us-west-1': {
    code: 'us-west-1',
    name: 'US West (N. California)',
    spotAdvisorCode: 'us-west-1'
  },
  'us-west-2': {
    code: 'us-west-2',
    name: 'US West (Oregon)',
    spotAdvisorCode: 'us-west-2'
  },
  'af-south-1': {
    code: 'af-south-1',
    name: 'Africa (Cape Town)',
    spotAdvisorCode: 'af-south-1'
  },
  'ap-east-1': {
    code: 'ap-east-1',
    name: 'Asia Pacific (Hong Kong)',
    spotAdvisorCode: 'ap-east-1'
  },
  'ap-south-1': {
    code: 'ap-south-1',
    name: 'Asia Pacific (Mumbai)',
    spotAdvisorCode: 'ap-south-1'
  },
  'ap-south-2': {
    code: 'ap-south-2',
    name: 'Asia Pacific (Hyderabad)',
    spotAdvisorCode: 'ap-south-2'
  },
  'ap-southeast-1': {
    code: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    spotAdvisorCode: 'ap-southeast-1'
  },
  'ap-southeast-2': {
    code: 'ap-southeast-2',
    name: 'Asia Pacific (Sydney)',
    spotAdvisorCode: 'ap-southeast-2'
  },
  'ap-southeast-3': {
    code: 'ap-southeast-3',
    name: 'Asia Pacific (Jakarta)',
    spotAdvisorCode: 'ap-southeast-3'
  },
  'ap-southeast-4': {
    code: 'ap-southeast-4',
    name: 'Asia Pacific (Melbourne)',
    spotAdvisorCode: 'ap-southeast-4'
  },
  'ap-southeast-6': {
    code: 'ap-southeast-6',
    name: 'Asia Pacific (Philippines)',
    spotAdvisorCode: 'ap-southeast-6'
  },
  'ap-southeast-7': {
    code: 'ap-southeast-7',
    name: 'Asia Pacific (Southeast)',
    spotAdvisorCode: 'ap-southeast-7'
  },
  'ap-northeast-1': {
    code: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    spotAdvisorCode: 'ap-northeast-1'
  },
  'ap-northeast-2': {
    code: 'ap-northeast-2',
    name: 'Asia Pacific (Seoul)',
    spotAdvisorCode: 'ap-northeast-2'
  },
  'ap-northeast-3': {
    code: 'ap-northeast-3',
    name: 'Asia Pacific (Osaka)',
    spotAdvisorCode: 'ap-northeast-3'
  },
  'ca-central-1': {
    code: 'ca-central-1',
    name: 'Canada (Central)',
    spotAdvisorCode: 'ca-central-1'
  },
  'ca-west-1': {
    code: 'ca-west-1',
    name: 'Canada (West)',
    spotAdvisorCode: 'ca-west-1'
  },
  'eu-central-1': {
    code: 'eu-central-1',
    name: 'Europe (Frankfurt)',
    spotAdvisorCode: 'eu-central-1'
  },
  'eu-central-2': {
    code: 'eu-central-2',
    name: 'Europe (Zurich)',
    spotAdvisorCode: 'eu-central-2'
  },
  'eu-west-1': {
    code: 'eu-west-1',
    name: 'Europe (Ireland)',
    spotAdvisorCode: 'eu-west-1'
  },
  'eu-west-2': {
    code: 'eu-west-2',
    name: 'Europe (London)',
    spotAdvisorCode: 'eu-west-2'
  },
  'eu-west-3': {
    code: 'eu-west-3',
    name: 'Europe (Paris)',
    spotAdvisorCode: 'eu-west-3'
  },
  'eu-south-1': {
    code: 'eu-south-1',
    name: 'Europe (Milan)',
    spotAdvisorCode: 'eu-south-1'
  },
  'eu-south-2': {
    code: 'eu-south-2',
    name: 'Europe (Spain)',
    spotAdvisorCode: 'eu-south-2'
  },
  'eu-north-1': {
    code: 'eu-north-1',
    name: 'Europe (Stockholm)',
    spotAdvisorCode: 'eu-north-1'
  },
  'il-central-1': {
    code: 'il-central-1',
    name: 'Israel (Tel Aviv)',
    spotAdvisorCode: 'il-central-1'
  },
  'me-central-1': {
    code: 'me-central-1',
    name: 'Middle East (UAE)',
    spotAdvisorCode: 'me-central-1'
  },
  'me-south-1': {
    code: 'me-south-1',
    name: 'Middle East (Bahrain)',
    spotAdvisorCode: 'me-south-1'
  },
  'sa-east-1': {
    code: 'sa-east-1',
    name: 'South America (São Paulo)',
    spotAdvisorCode: 'sa-east-1'
  },
  'mx-central-1': {
    code: 'mx-central-1',
    name: 'Mexico (Central)',
    spotAdvisorCode: 'mx-central-1'
  }
};

export function getRegionInfo(regionCode: RegionCode): RegionInfo {
  return regionMap[regionCode] || {
    code: regionCode,
    name: regionCode,
    spotAdvisorCode: regionCode
  };
}

export function getSpotAdvisorCode(regionCode: RegionCode): string {
  return getRegionInfo(regionCode).spotAdvisorCode;
}

export function getRegionName(regionCode: RegionCode): string {
  return getRegionInfo(regionCode).name;
}

export function getRegionCode(name: string): RegionCode | undefined {
  return Object.values(regionMap).find(region => region.name === name)?.code;
}

export function isValidRegionCode(code: string): code is RegionCode {
  return code in regionMap;
} 