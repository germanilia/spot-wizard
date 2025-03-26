from typing import Dict, List, Optional, Annotated
from pydantic import BaseModel, TypeAdapter


class InstanceType(BaseModel):
    emr: bool
    cores: int
    ram_gb: float


class Range(BaseModel):
    index: int
    label: str
    dots: int
    max: int


class SpotMetrics(BaseModel):
    s: int  # Score
    r: int  # Rating


class InstanceSpotData(BaseModel):
    Linux: Dict[str, SpotMetrics]
    Windows: Optional[Dict[str, SpotMetrics]] = None


RegionSpotData = TypeAdapter(Dict[str, InstanceSpotData])


class SpotData(BaseModel):
    instance_types: Dict[str, InstanceType]
    ranges: List[Range]
    spot_advisor: Dict[str, Dict[str, Dict[str, SpotMetrics]]]  # region -> OS -> instance_type -> metrics 