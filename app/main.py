from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import httpx
import asyncio
import logging
import sys
from .models.spot import SpotData, InstanceSpotData, RegionSpotData
from .services.cache_service import CacheService
from .api.pricing import router as pricing_router
from .api.aws import router as aws_router
from .scripts.init_data import init_data
from fastapi.responses import StreamingResponse, FileResponse
import json
from typing import AsyncGenerator

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True  # Override any existing configuration
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Spot Wizard API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define API routes first
@app.get("/api/spot-data")
async def get_spot_data():
    try:
        data = await fetch_spot_data()
        
        # Validate the data against our model
        validated_data = SpotData(**data)
        
        # Return the validated data
        return validated_data
    except ValueError as e:
        logger.error(f"Data validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Invalid data format: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing spot data: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing spot data: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Include routers
app.include_router(pricing_router, prefix="/api")
app.include_router(aws_router, prefix="/api/aws")

# Mount static files last, after all API routes
static_path = Path("/app/static")
if static_path.exists():
    # Mount static files at root
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize data on application startup."""
    logger.info("Starting data initialization...")
    await init_data()
    logger.info("Data initialization complete")

async def fetch_spot_data() -> dict:
    try:
        # Try to get cached data first
        cached_data = CacheService.get_cached_data("spot_advisor_data.json")
        if cached_data:
            return cached_data

        # If no cached data, fetch from AWS with proper timeout and chunk handling
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info("Fetching spot data from AWS...")
            response = await client.get(
                "https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json",
                headers={"Accept-Encoding": "gzip"}
            )
            response.raise_for_status()
            data = response.json()
            
            # Transform the data to match our model structure
            transformed_data = {
                "instance_types": data.get("instance_types", {}),
                "ranges": data.get("ranges", []),
                "spot_advisor": {}
            }
            
            # Transform spot_advisor data to match our model
            for region, region_data in data.get("spot_advisor", {}).items():
                transformed_data["spot_advisor"][region] = {}
                for os_type in ["Linux", "Windows"]:
                    if os_type in region_data:
                        transformed_data["spot_advisor"][region][os_type] = region_data[os_type]
            
            # Cache the transformed data
            CacheService.save_cached_data("spot_advisor_data.json", transformed_data)
            
            return transformed_data
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch spot data: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to fetch spot data: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 