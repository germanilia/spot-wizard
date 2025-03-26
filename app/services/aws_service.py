import boto3
from botocore.exceptions import ClientError
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class EC2Instance(BaseModel):
    instance_id: str
    instance_type: str
    region: str
    state: str
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    platform: str = "Linux"  # Default to Linux if not specified

class EC2RegionSummary(BaseModel):
    region: str
    instance_types: Dict[str, int]  # Map of instance_type to count

class AWSCredentials(BaseModel):
    access_key: str
    secret_key: str
    regions: List[str]

class AWSService:
    @staticmethod
    async def get_ec2_instances(credentials: AWSCredentials) -> Dict[str, List[EC2Instance]]:
        """
        Get all EC2 instances from specified regions using provided credentials
        """
        result = {}
        
        for region in credentials.regions:
            try:
                # Create a session with the provided credentials
                session = boto3.Session(
                    aws_access_key_id=credentials.access_key,
                    aws_secret_access_key=credentials.secret_key,
                    region_name=region
                )
                
                # Create EC2 client
                ec2_client = session.client('ec2')
                
                # Get EC2 instances
                response = ec2_client.describe_instances()
                
                instances = []
                for reservation in response['Reservations']:
                    for instance in reservation['Instances']:
                        # Skip terminated instances
                        if instance['State']['Name'] == 'terminated':
                            continue
                            
                        platform = "Windows" if instance.get('Platform') == 'windows' else "Linux"
                        
                        instances.append(EC2Instance(
                            instance_id=instance['InstanceId'],
                            instance_type=instance['InstanceType'],
                            region=region,
                            state=instance['State']['Name'],
                            private_ip=instance.get('PrivateIpAddress'),
                            public_ip=instance.get('PublicIpAddress'),
                            platform=platform
                        ))
                
                result[region] = instances
                logger.info(f"Retrieved {len(instances)} instances from region {region}")
                
            except ClientError as e:
                logger.error(f"Error fetching instances from region {region}: {str(e)}")
                # Continue to other regions even if one fails
        
        return result
    
    @staticmethod
    async def get_ec2_summary(credentials: AWSCredentials) -> List[EC2RegionSummary]:
        """
        Get summary of EC2 instances by region and instance type
        """
        instances_by_region = await AWSService.get_ec2_instances(credentials)
        
        result = []
        for region, instances in instances_by_region.items():
            instance_type_count = {}
            
            for instance in instances:
                if instance.instance_type not in instance_type_count:
                    instance_type_count[instance.instance_type] = 0
                instance_type_count[instance.instance_type] += 1
            
            result.append(EC2RegionSummary(
                region=region,
                instance_types=instance_type_count
            ))
        
        return result 