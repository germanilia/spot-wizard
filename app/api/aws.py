from fastapi import APIRouter, HTTPException
from typing import List, Dict
import logging
from app.services.aws_service import AWSService, AWSCredentials, EC2RegionSummary, EC2Instance

router = APIRouter(tags=["aws"])
logger = logging.getLogger(__name__)

@router.post("/ec2-instances")
async def get_ec2_instances(credentials: AWSCredentials) -> Dict[str, List[EC2Instance]]:
    """
    Get EC2 instances from specified regions using provided credentials.
    """
    try:
        instances = await AWSService.get_ec2_instances(credentials)
        return instances
    except Exception as e:
        logger.error(f"Error fetching EC2 instances: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching EC2 instances: {str(e)}")

@router.post("/ec2-summary")
async def get_ec2_summary(credentials: AWSCredentials) -> List[EC2RegionSummary]:
    """
    Get summary of EC2 instances by region and instance type.
    """
    try:
        summary = await AWSService.get_ec2_summary(credentials)
        return summary
    except Exception as e:
        logger.error(f"Error fetching EC2 summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching EC2 summary: {str(e)}") 