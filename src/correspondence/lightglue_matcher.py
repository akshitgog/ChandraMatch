import torch
import numpy as np
from typing import Any, Dict, List, Tuple
from src.correspondence.base import CorrespondenceMethod
from src.utils.logging import logger
from lightglue import LightGlue, SuperPoint
from lightglue.utils import numpy_image_to_torch, rbd


class LightGlueMatcher(CorrespondenceMethod):
    def __init__(self, max_num_keypoints=2048, filter_threshold=0.1):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"LightGlue using device: {self.device}")

        self.extractor = SuperPoint(max_num_keypoints=max_num_keypoints).eval().to(self.device)
        self.matcher = LightGlue(features="superpoint", filter_threshold=filter_threshold).eval().to(self.device)

    def detect(self, image: np.ndarray, metadata: Dict[str, Any] = None) -> Any:
        return None

    def describe(self, image: np.ndarray, keypoints: Any) -> Tuple[Any, Any]:
        return None, None

    def _to_tensor(self, image: np.ndarray) -> torch.Tensor:
        if image.dtype != np.uint8:
            image = np.clip(image, 0, 255).astype(np.uint8)
        if image.ndim == 2:
            image = np.stack([image] * 3, axis=-1)
        return numpy_image_to_torch(image).to(self.device)

    def match(
        self,
        source_image: np.ndarray,
        reference_image: np.ndarray,
        source_metadata: Dict[str, Any] = None,
        reference_metadata: Dict[str, Any] = None,
    ) -> List[Tuple[float, float, float, float, float]]:
        h1, w1 = source_image.shape[:2]
        h2, w2 = reference_image.shape[:2]

        max_dim = 1024
        scale1 = min(1.0, max_dim / max(h1, w1))
        scale2 = min(1.0, max_dim / max(h2, w2))

        if scale1 < 1.0:
            src_resized = self._resize(source_image, scale1)
        else:
            src_resized = source_image

        if scale2 < 1.0:
            ref_resized = self._resize(reference_image, scale2)
        else:
            ref_resized = reference_image

        t0 = self._to_tensor(src_resized)
        t1 = self._to_tensor(ref_resized)

        with torch.no_grad():
            feats0 = self.extractor.extract(t0)
            feats1 = self.extractor.extract(t1)
            matches_result = self.matcher({"image0": feats0, "image1": feats1})

        feats0, feats1, matches_result = [rbd(x) for x in [feats0, feats1, matches_result]]

        kpts0 = feats0["keypoints"].cpu().numpy()
        kpts1 = feats1["keypoints"].cpu().numpy()
        match_indices = matches_result["matches"].cpu().numpy()
        match_scores = matches_result["scores"].cpu().numpy()

        logger.info(f"LightGlue found {len(match_indices)} correspondences.")

        m0 = match_indices[:, 0]
        m1 = match_indices[:, 1]

        matches = []
        for i in range(len(m0)):
            x1 = kpts0[m0[i]][0] / scale1
            y1 = kpts0[m0[i]][1] / scale1
            x2 = kpts1[m1[i]][0] / scale2
            y2 = kpts1[m1[i]][1] / scale2
            matches.append((float(x1), float(y1), float(x2), float(y2), float(match_scores[i])))

        return matches

    @staticmethod
    def _resize(img: np.ndarray, scale: float) -> np.ndarray:
        import cv2
        new_w = max(1, int(img.shape[1] * scale))
        new_h = max(1, int(img.shape[0] * scale))
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
