import xml.etree.ElementTree as ET
from pathlib import Path
from src.data.pair import SensorMetadata
from src.utils.logging import logger

def parse_pds4_xml(xml_path: str | Path) -> SensorMetadata:
    """
    Parses a Chandrayaan-2 PDS4 XML file to extract image metadata.
    This extracts critical information like resolution, dimensions, and solar geometry.
    """
    path = Path(xml_path)
    if not path.exists():
        logger.error(f"Metadata XML not found: {path}")
        raise FileNotFoundError(f"Metadata XML not found: {path}")

    logger.info(f"Parsing PDS4 XML metadata: {path.name}")
    
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        
        # Helper to search ignoring namespaces
        def find_value(tag_name: str, type_func=float):
            for elem in root.iter():
                # Strip namespace for simple matching
                clean_tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                if clean_tag == tag_name and elem.text is not None:
                    return type_func(elem.text.strip())
            return None

        # 1. Resolution
        resolution_m = find_value("pixel_resolution", float) or 0.0
        
        # 2. Solar Geometry
        solar_azimuth = find_value("sun_azimuth", float)
        solar_elevation = find_value("sun_elevation", float)
        solar_incidence = find_value("solar_incidence", float)
        
        # 3. Dimensions
        # In PDS4, these are inside Axis_Array where axis_name is Line or Sample
        lines = 0
        samples = 0
        for axis in root.findall(".//{http://pds.nasa.gov/pds4/pds/v1}Axis_Array") or root.iter():
            clean_tag = axis.tag.split('}')[-1] if '}' in axis.tag else axis.tag
            if clean_tag == "Axis_Array":
                name_elem = axis.find(".//{http://pds.nasa.gov/pds4/pds/v1}axis_name")
                elem_count = axis.find(".//{http://pds.nasa.gov/pds4/pds/v1}elements")
                
                # Fallback namespace-agnostic search if standard namespace fails
                if name_elem is None:
                    for child in axis:
                        if "axis_name" in child.tag: name_elem = child
                        if "elements" in child.tag: elem_count = child
                        
                if name_elem is not None and elem_count is not None:
                    if name_elem.text.strip() == "Line":
                        lines = int(elem_count.text.strip())
                    elif name_elem.text.strip() == "Sample":
                        samples = int(elem_count.text.strip())
        
        logger.info(f"Extracted metadata from {path.name}: {lines}x{samples}, GSD: {resolution_m}m")

        return SensorMetadata(
            resolution_m=resolution_m,
            dimensions_native=(lines, samples),
            solar_azimuth=solar_azimuth,
            solar_elevation=solar_elevation,
            solar_incidence=solar_incidence
        )
        
    except ET.ParseError as e:
        logger.error(f"Failed to parse XML {path}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error parsing XML {path}: {e}")
        raise
