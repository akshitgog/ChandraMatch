from dataclasses import dataclass, field
from typing import Optional, Tuple, Dict, Any
import numpy as np

@dataclass
class SensorMetadata:
    """Stores available metadata for a single sensor capture."""
    resolution_m: float
    dimensions_native: Tuple[int, int]
    acquisition_time: Optional[str] = None
    solar_azimuth: Optional[float] = None
    solar_elevation: Optional[float] = None
    solar_incidence: Optional[float] = None
    lat_corners: Optional[Tuple[float, float, float, float]] = None
    lon_corners: Optional[Tuple[float, float, float, float]] = None
    crs: Optional[str] = None

@dataclass
class ImagePair:
    """Represents a correspondence pair between two multimodal lunar images."""
    pair_id: str
    
    # Native TMC-2 data
    tmc2_image: np.ndarray
    tmc2_native_shape: Tuple[int, int]
    tmc2_metadata: SensorMetadata
    tmc2_filepath: str
    
    # Native OHRC data
    ohrc_image: np.ndarray
    ohrc_native_shape: Tuple[int, int]
    ohrc_metadata: SensorMetadata
    ohrc_filepath: str
    
    # Spatial relation
    geographic_overlap: Optional[Dict[str, Any]] = None
    
    def get_solar_differences(self) -> Dict[str, Optional[float]]:
        """Calculates differences in solar geometry if available."""
        diffs = {"azimuth": None, "elevation": None, "incidence": None}
        
        t_meta = self.tmc2_metadata
        o_meta = self.ohrc_metadata
        
        if t_meta.solar_azimuth is not None and o_meta.solar_azimuth is not None:
            diffs["azimuth"] = abs(t_meta.solar_azimuth - o_meta.solar_azimuth)
        if t_meta.solar_elevation is not None and o_meta.solar_elevation is not None:
            diffs["elevation"] = abs(t_meta.solar_elevation - o_meta.solar_elevation)
        if t_meta.solar_incidence is not None and o_meta.solar_incidence is not None:
            diffs["incidence"] = abs(t_meta.solar_incidence - o_meta.solar_incidence)
            
        return diffs
