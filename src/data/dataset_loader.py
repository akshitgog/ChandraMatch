from abc import ABC, abstractmethod
from typing import List, Dict
import os
import numpy as np
from src.data.pair import ImagePair
from src.utils.exceptions import DatasetUnavailableError
from src.utils.logging import logger

class BaseDatasetLoader(ABC):
    @abstractmethod
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        pass

class HuggingFaceLoader(BaseDatasetLoader):
    def __init__(self, config: dict, token: str):
        self.repo_id = config.get("dataset", {}).get("huggingface", {}).get("repo_id")
        self.token = token
        
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        logger.info(f"Attempting to load {pair_id} from Hugging Face...")
        # Simulating failure to force fallback for this scaffolding
        raise DatasetUnavailableError("Hugging Face dataset not accessible or internet disconnected.")

class LocalLoader(BaseDatasetLoader):
    def __init__(self, config: dict):
        self.root_dir = config.get("dataset", {}).get("local", {}).get("root_dir", "./data/local")
        self.target_match_px = config.get("matching", {}).get("target_match_px", 500)
        
    def load_pair(self, pair_id: str, paths: Dict[str, str]) -> ImagePair:
        logger.info(f"Attempting to load {pair_id} locally from {self.root_dir}...")
        
        tmc_xml_full = os.path.join(self.root_dir, paths.get("tmc2_xml", ""))
        tmc_img_full = os.path.join(self.root_dir, paths.get("tmc2_img", ""))
        ohrc_xml_full = os.path.join(self.root_dir, paths.get("ohrc_xml", ""))
        ohrc_img_full = os.path.join(self.root_dir, paths.get("ohrc_img", ""))
        
        # For scaffolding, if the folders exist, we simulate success
        # We check the directory since we haven't actually created the dummy XML/IMG files
        tmc_dir = os.path.dirname(tmc_xml_full)
        ohrc_dir = os.path.dirname(ohrc_xml_full)
        
        if not os.path.exists(tmc_dir) or not os.path.exists(ohrc_dir):
            raise DatasetUnavailableError(f"Local paths do not exist: {tmc_dir} / {ohrc_dir}")
            
        logger.info(f"Loaded {pair_id} successfully from local storage.")
        
        from src.data.metadata import parse_pds4_xml
        logger.info("Parsing actual XML metadata...")
        t_meta = parse_pds4_xml(tmc_xml_full)
        o_meta = parse_pds4_xml(ohrc_xml_full)
        
        # import pds4_tools
        # tmc2_image = pds4_tools.read(tmc_xml_full)[0].data
        # ohrc_image = pds4_tools.read(ohrc_xml_full)[0].data
        
        # Read real data using memory mapping to avoid RAM crashes
        # TMC-2 is 16-bit (UnsignedLSB2), OHRC is 8-bit (UnsignedByte)
        logger.info("Memory mapping binary images to extract geographically matched crops...")
        
        tmc_full_array = np.memmap(tmc_img_full, dtype=np.uint16, mode='r', shape=t_meta.dimensions_native)
        ohrc_full_array = np.memmap(ohrc_img_full, dtype=np.uint8, mode='r', shape=o_meta.dimensions_native)
        
        # Geographic footprint extraction
        # We find the center of OHRC in latitude/longitude and project it onto TMC-2
        o_lat_corners = o_meta.lat_corners
        o_lon_corners = o_meta.lon_corners
        t_lat_corners = t_meta.lat_corners
        t_lon_corners = t_meta.lon_corners
        
        if o_lat_corners and o_lon_corners and t_lat_corners and t_lon_corners:
            import cv2
            ohrc_center_lat = sum(o_lat_corners) / 4.0
            ohrc_center_lon = sum(o_lon_corners) / 4.0
            
            # Corners: UL, UR, LL, LR
            src_pts = np.float32([
                [t_lon_corners[0], t_lat_corners[0]],
                [t_lon_corners[1], t_lat_corners[1]],
                [t_lon_corners[2], t_lat_corners[2]],
                [t_lon_corners[3], t_lat_corners[3]]
            ])
            
            H, W = t_meta.dimensions_native
            dst_pts = np.float32([
                [0, 0],
                [W-1, 0],
                [0, H-1],
                [W-1, H-1]
            ])
            
            # Map (lon, lat) to (pixel_x, pixel_y) for TMC-2
            M = cv2.getPerspectiveTransform(src_pts, dst_pts)
            
            o_center = np.float32([[[ohrc_center_lon, ohrc_center_lat]]])
            t_center_pixel = cv2.perspectiveTransform(o_center, M)[0][0]
            
            tc_x, tc_y = int(t_center_pixel[0]), int(t_center_pixel[1])
            
            # Apply per-pair pointing offset correction from config
            offset_x = paths.get("pointing_offset_x", 0)
            offset_y = paths.get("pointing_offset_y", 0)
            tc_x += offset_x
            tc_y += offset_y
            
            logger.info(f"Geographic overlap mapped OHRC center {ohrc_center_lon:.2f}, {ohrc_center_lat:.2f} to TMC-2 pixel ({tc_x}, {tc_y}) [Manual Offset Applied]")
        else:
            logger.warning("Missing geographic corners, falling back to absolute array center.")
            tc_y, tc_x = t_meta.dimensions_native[0]//2, t_meta.dimensions_native[1]//2
            
        oc_y, oc_x = o_meta.dimensions_native[0]//2, o_meta.dimensions_native[1]//2
        
        # Size the crops so that after OHRC downsampling, both matching images are ~500px per side.
        # This avoids the old 92x92 catastrophe from a fixed 2000px OHRC crop.
        target_match_px = self.target_match_px
        scale_ratio = (t_meta.resolution_m / o_meta.resolution_m) if t_meta.resolution_m and o_meta.resolution_m else 21.6

        H_o, W_o = o_meta.dimensions_native
        H_t, W_t = t_meta.dimensions_native

        ohrc_target = int(target_match_px * scale_ratio)
        ohrc_crop_h = min(ohrc_target, H_o)
        ohrc_crop_w = min(ohrc_target, W_o)

        tmc_crop_h = min(int(ohrc_crop_h / scale_ratio), H_t)
        tmc_crop_w = min(int(ohrc_crop_w / scale_ratio), W_t)

        # Safe boundary extraction for TMC-2
        half_t_h, half_t_w = tmc_crop_h // 2, tmc_crop_w // 2
        t_start_y = max(0, tc_y - half_t_h)
        t_end_y = min(H_t, tc_y + half_t_h)
        t_start_x = max(0, tc_x - half_t_w)
        t_end_x = min(W_t, tc_x + half_t_w)
        tmc2_crop = np.array(tmc_full_array[t_start_y:t_end_y, t_start_x:t_end_x])

        # Safe boundary extraction for OHRC
        half_o_h, half_o_w = ohrc_crop_h // 2, ohrc_crop_w // 2
        o_start_y = max(0, oc_y - half_o_h)
        o_end_y = min(H_o, oc_y + half_o_h)
        o_start_x = max(0, oc_x - half_o_w)
        o_end_x = min(W_o, oc_x + half_o_w)
        ohrc_crop = np.array(ohrc_full_array[o_start_y:o_end_y, o_start_x:o_end_x])
        
        overlap_info = {
            "tmc2_offset": (t_start_x, t_start_y),
            "ohrc_offset": (o_start_x, o_start_y)
        }
        
        return ImagePair(
            pair_id=pair_id,
            tmc2_image=tmc2_crop,
            tmc2_native_shape=t_meta.dimensions_native,
            tmc2_metadata=t_meta,
            tmc2_filepath=tmc_img_full,
            ohrc_image=ohrc_crop,
            ohrc_native_shape=o_meta.dimensions_native,
            ohrc_metadata=o_meta,
            ohrc_filepath=ohrc_img_full,
            geographic_overlap=overlap_info
        )

def get_dataset(config: dict, token: str) -> List[ImagePair]:
    """Hierarchical loader based on configured priority."""
    priority = config.get("dataset", {}).get("source_priority", ["huggingface", "local"])
    pairs_config = config.get("dataset", {}).get("pairs", {})
    
    loaded_pairs = []
    
    for pair_id, paths in pairs_config.items():
        pair_loaded = False
        errors = []
        
        for source in priority:
            try:
                if source == "huggingface" and config["dataset"]["huggingface"]["enabled"]:
                    loader = HuggingFaceLoader(config, token)
                    pair = loader.load_pair(pair_id, paths)
                    loaded_pairs.append(pair)
                    pair_loaded = True
                    break
                    
                elif source == "local" and config["dataset"]["local"]["enabled"]:
                    loader = LocalLoader(config)
                    pair = loader.load_pair(pair_id, paths)
                    loaded_pairs.append(pair)
                    pair_loaded = True
                    break
                    
            except Exception as e:
                logger.warning(f"{source} loader failed for {pair_id}: {str(e)}")
                errors.append(f"{source}: {str(e)}")
                
        if not pair_loaded:
            err_msg = f"Dataset unavailable for {pair_id}.\n" + "\n".join(errors)
            logger.error(err_msg)
            # GUI Error handling for headless/UI fallback
            try:
                import tkinter as tk
                from tkinter import messagebox
                root = tk.Tk()
                root.withdraw()
                messagebox.showerror("Dataset Load Error", err_msg)
                root.destroy()
            except ImportError:
                logger.error("GUI error popup unavailable. Running in headless mode.")
                
            raise DatasetUnavailableError(err_msg)
            
    return loaded_pairs
