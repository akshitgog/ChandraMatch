from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple, List
import numpy as np

class CorrespondenceMethod(ABC):
    """
    Pluggable interface for correspondence detection.
    DO NOT use ORB implementations here.
    """
    
    @abstractmethod
    def detect(self, image: np.ndarray, metadata: Dict[str, Any] = None) -> Any:
        """Detect keypoints in an image."""
        pass

    @abstractmethod
    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        """Compute descriptors for detected keypoints."""
        pass

    @abstractmethod
    def match(self, 
              source_image: np.ndarray, 
              reference_image: np.ndarray,
              source_metadata: Dict[str, Any] = None,
              reference_metadata: Dict[str, Any] = None) -> List[Tuple[float, float, float, float, float]]:
        """
        Matches source to reference and returns coordinate tuples.
        Expected return format per match: (src_x, src_y, ref_x, ref_y, score)
        """
        pass
