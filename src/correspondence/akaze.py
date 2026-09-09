import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
from src.correspondence.base import CorrespondenceMethod
from src.utils.logging import logger

class AKAZEMatcher(CorrespondenceMethod):
    """
    Implements AKAZE (Accelerated-KAZE) for robust, scale-invariant, 
    and illumination-invariant feature matching without using ORB.
    """
    def __init__(self):
        self.detector = cv2.AKAZE_create()
        self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING)

    def detect(self, image: np.ndarray, metadata: Dict[str, Any] = None) -> Any:
        return self.detector.detect(image, None)

    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        return self.detector.compute(image, keypoints)

    def match(self, 
              source_image: np.ndarray, 
              reference_image: np.ndarray,
              source_metadata: Dict[str, Any] = None,
              reference_metadata: Dict[str, Any] = None) -> List[Tuple[float, float, float, float, float]]:
        
        logger.info("Detecting and describing features with AKAZE...")
        kp1, des1 = self.detector.detectAndCompute(source_image, None)
        kp2, des2 = self.detector.detectAndCompute(reference_image, None)
        
        if des1 is None or des2 is None or len(kp1) < 2 or len(kp2) < 2:
            logger.warning("Not enough features detected to perform matching.")
            return []

        logger.info(f"Found {len(kp1)} features in source, {len(kp2)} in reference. Matching...")
        
        # KNN match with k=2 for Lowe's ratio test
        raw_matches = self.matcher.knnMatch(des1, des2, k=2)
        
        good_matches = []
        for m, n in raw_matches:
            if m.distance < 0.75 * n.distance:  # Lowe's Ratio Test
                pt1 = kp1[m.queryIdx].pt
                pt2 = kp2[m.trainIdx].pt
                # Score is inversely proportional to hamming distance
                score = 1.0 / (1.0 + m.distance) 
                good_matches.append((pt1[0], pt1[1], pt2[0], pt2[1], score))
                
        logger.info(f"Retained {len(good_matches)} raw matches after ratio test.")
        return good_matches
