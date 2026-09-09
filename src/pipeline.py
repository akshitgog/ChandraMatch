import os
import json
import csv
from pathlib import Path
import numpy as np
import cv2
from src.data.pair import ImagePair
from src.utils.logging import logger

class ChandraMatchPipeline:
    def __init__(self, config: dict):
        self.config = config
        self.output_root = Path(config.get("output", {}).get("root_dir", "./outputs"))
        self.output_root.mkdir(parents=True, exist_ok=True)
        
    def process_pair(self, pair: ImagePair) -> dict:
        logger.info(f"--- Processing Pair: {pair.pair_id} ---")
        
        # Setup Output Directories
        pair_out_dir = self.output_root / pair.pair_id
        dirs = ["preprocessing", "matches", "registration", "visualization"]
        for d in dirs:
            (pair_out_dir / d).mkdir(parents=True, exist_ok=True)
            
        # 1. Save Metadata
        self._save_metadata(pair, pair_out_dir)
        
        # 2. Geographic Overlap
        self._geographic_overlap(pair)
        
        # 3. Preprocessing (Illumination, Gradients, Shadows)
        self._preprocess_images(pair, pair_out_dir)
        
        # 4. Multi-scale Correspondence & Verification
        backend = self.config.get("matching", {}).get("backend", "sift")
        if backend == "sift":
            from src.correspondence.sift import SIFTMatcher
            matcher = SIFTMatcher()
        elif backend == "akaze":
            from src.correspondence.akaze import AKAZEMatcher
            matcher = AKAZEMatcher()
        elif backend == "loftr":
            from src.correspondence.loftr import LoFTRMatcher
            logger.info("Initializing LoFTR Transformer backend...")
            matcher = LoFTRMatcher()
        elif backend == "lightglue":
            from src.correspondence.lightglue_matcher import LightGlueMatcher
            logger.info("Initializing LightGlue+SuperPoint backend...")
            matcher = LightGlueMatcher()
        elif backend == "ensemble":
            from src.correspondence.sift import SIFTMatcher
            from src.correspondence.loftr import LoFTRMatcher
            from src.correspondence.ensemble import EnsembleMatcher

            matchers = [SIFTMatcher(), LoFTRMatcher()]
            try:
                from src.correspondence.akaze import AKAZEMatcher
                matchers.append(AKAZEMatcher())
                logger.info("Initializing Ensemble backend (SIFT + LoFTR + AKAZE)...")
            except Exception as e:
                logger.warning(f"AKAZE not available ({e}). Using Ensemble (SIFT + LoFTR)...")

            matcher = EnsembleMatcher(matchers)
        else:
            raise ValueError(f"Backend {backend} not implemented.")
            
        matches_info = self._compute_correspondence(pair, pair_out_dir, matcher)
        
        # 5. Registration
        self._register_images(pair_out_dir, pair, matches_info["H"])
        
        # 6. Evaluation
        metrics = self._evaluate_and_save_metrics(pair, matches_info, pair_out_dir)
        
        # 7. Visualizations
        self._generate_visualizations(pair_out_dir, pair, matches_info["inliers"], matches_info["H"])
        
        logger.info(f"Successfully processed {pair.pair_id}. Outputs saved to {pair_out_dir}")
        return metrics
        
    def _save_metadata(self, pair: ImagePair, out_dir: Path):
        meta = {
            "pair_id": pair.pair_id,
            "tmc2": {
                "shape": pair.tmc2_native_shape,
                "resolution": pair.tmc2_metadata.resolution_m
            },
            "ohrc": {
                "shape": pair.ohrc_native_shape,
                "resolution": pair.ohrc_metadata.resolution_m
            }
        }
        with open(out_dir / "metadata.json", "w") as f:
            json.dump(meta, f, indent=4)
            
    def _geographic_overlap(self, pair: ImagePair):
        logger.info("Computing geographic footprint intersection...")
        # Placeholder for actual overlap calculation
        pass

    def _preprocess_images(self, pair: ImagePair, out_dir: Path):
        logger.info("Normalizing illumination and generating structure representations...")
        pre_dir = out_dir / "preprocessing"
        
        # Perform actual normalizations
        # TMC2 is 16-bit, so normalize it to 8-bit for processing and visualization
        t_norm = cv2.normalize(pair.tmc2_image, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        o_norm = cv2.normalize(pair.ohrc_image, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # Calculate gradients (Sobel)
        t_grad_x = cv2.Sobel(t_norm, cv2.CV_32F, 1, 0, ksize=3)
        t_grad_y = cv2.Sobel(t_norm, cv2.CV_32F, 0, 1, ksize=3)
        t_grad = cv2.magnitude(t_grad_x, t_grad_y)
        t_grad_norm = cv2.normalize(t_grad, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        o_grad_x = cv2.Sobel(o_norm, cv2.CV_32F, 1, 0, ksize=3)
        o_grad_y = cv2.Sobel(o_norm, cv2.CV_32F, 0, 1, ksize=3)
        o_grad = cv2.magnitude(o_grad_x, o_grad_y)
        o_grad_norm = cv2.normalize(o_grad, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # Shadow Masks (Simple threshold for lowest 5% intensity)
        _, t_shadow = cv2.threshold(t_norm, np.percentile(t_norm, 5), 255, cv2.THRESH_BINARY_INV)
        _, o_shadow = cv2.threshold(o_norm, np.percentile(o_norm, 5), 255, cv2.THRESH_BINARY_INV)
        
        # Save the real images
        cv2.imwrite(str(pre_dir / "tmc2_normalized.png"), t_norm)
        cv2.imwrite(str(pre_dir / "ohrc_normalized.png"), o_norm)
        cv2.imwrite(str(pre_dir / "tmc2_gradient.png"), t_grad_norm)
        cv2.imwrite(str(pre_dir / "ohrc_gradient.png"), o_grad_norm)
        cv2.imwrite(str(pre_dir / "tmc2_shadow_mask.png"), t_shadow)
        cv2.imwrite(str(pre_dir / "ohrc_shadow_mask.png"), o_shadow)

    def _compute_correspondence(self, pair: ImagePair, out_dir: Path, matcher) -> dict:
        logger.info("Performing multi-scale matching and geometric verification...")
        match_dir = out_dir / "matches"
        
        # Robust Normalization (2nd to 98th percentile) to ignore extreme shadow/sun glint
        def robust_normalize(img):
            valid_pixels = img[img > 0]
            if len(valid_pixels) == 0: 
                return cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
            p_low, p_high = np.percentile(valid_pixels, (2, 98))
            img_clipped = np.clip(img, p_low, p_high)
            return cv2.normalize(img_clipped, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)

        t_norm = robust_normalize(pair.tmc2_image)
        o_norm = robust_normalize(pair.ohrc_image)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This pulls details out of heavy shadows and flattens global sun angle differences
        logger.info("Applying CLAHE for illumination invariance...")
        clip_limit = self.config.get("preprocessing", {}).get("clahe", {}).get("clip_limit", 3.0)
        tile_sz = self.config.get("preprocessing", {}).get("clahe", {}).get("tile_size", 8)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_sz, tile_sz))
        t_clahe = clahe.apply(t_norm)
        o_clahe = clahe.apply(o_norm)
        
        # Calculate physical scale ratio based on metadata
        res_t = pair.tmc2_metadata.resolution_m if pair.tmc2_metadata and pair.tmc2_metadata.resolution_m else 5.0
        res_o = pair.ohrc_metadata.resolution_m if pair.ohrc_metadata and pair.ohrc_metadata.resolution_m else 0.25
        scale_factor = res_t / res_o

        # Downsample OHRC to TMC-2 native resolution — both sides keep real pixel data
        new_w = int(o_clahe.shape[1] / scale_factor)
        new_h = int(o_clahe.shape[0] / scale_factor)
        logger.info(f"Downsampling OHRC by {scale_factor:.2f}x (to {new_w}x{new_h}) for resolution-matched matching...")
        o_downsampled = cv2.resize(o_clahe, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Gradient magnitude representation: edges from crater rims and ridges
        # are illumination-invariant — they appear regardless of sun direction.
        def gradient_magnitude(img):
            gx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3)
            mag = cv2.magnitude(gx, gy)
            return cv2.normalize(mag, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)

        t_grad = gradient_magnitude(t_clahe)
        o_grad = gradient_magnitude(o_downsampled)
        logger.info("Computed gradient magnitude representations for illumination-invariant matching.")

        # Match on both CLAHE intensity AND gradient representations, then merge
        representations = [
            ("intensity", t_clahe, o_downsampled),
            ("gradient", t_grad, o_grad),
        ]
        scales = self.config.get("scale", {}).get("pyramid", {}).get("scales", [1.0, 0.75, 0.5])
        all_matches_ds = []

        for rep_name, t_rep, o_rep in representations:
            logger.info(f"Running multiscale matching on {rep_name} at pyramid levels: {scales}")
            for pyr_scale in scales:
                if pyr_scale == 1.0:
                    m_t = t_rep
                    m_o = o_rep
                else:
                    p_w_t = max(32, int(t_rep.shape[1] * pyr_scale))
                    p_h_t = max(32, int(t_rep.shape[0] * pyr_scale))
                    p_w_o = max(32, int(o_rep.shape[1] * pyr_scale))
                    p_h_o = max(32, int(o_rep.shape[0] * pyr_scale))
                    m_t = cv2.resize(t_rep, (p_w_t, p_h_t), interpolation=cv2.INTER_AREA)
                    m_o = cv2.resize(o_rep, (p_w_o, p_h_o), interpolation=cv2.INTER_AREA)

                pyr_matches = matcher.match(m_t, m_o)
                logger.info(f"  {rep_name} pyramid {pyr_scale}: {len(pyr_matches)} matches")

                for m in pyr_matches:
                    all_matches_ds.append((
                        m[0] / pyr_scale,
                        m[1] / pyr_scale,
                        m[2] / pyr_scale,
                        m[3] / pyr_scale,
                        m[4]
                    ))

        logger.info(f"Aggregated {len(all_matches_ds)} total matches across all pyramid levels.")

        # Deduplicate matches: same feature matched from multiple pyramid levels/representations
        def deduplicate_matches(matches, radius=3.0):
            if not matches:
                return matches
            sorted_m = sorted(matches, key=lambda m: -m[4])
            kept = []
            for m in sorted_m:
                duplicate = False
                for k in kept:
                    if abs(m[0] - k[0]) < radius and abs(m[1] - k[1]) < radius:
                        duplicate = True
                        break
                if not duplicate:
                    kept.append(m)
            return kept

        dedup_r = self.config.get("matching", {}).get("dedup_radius", 3.0)
        all_matches_ds = deduplicate_matches(all_matches_ds, radius=dedup_r)
        logger.info(f"After deduplication: {len(all_matches_ds)} unique matches.")

        # Filter low-confidence matches
        conf_threshold = self.config.get("matching", {}).get("confidence_threshold", 0.3)
        filtered = [m for m in all_matches_ds if m[4] >= conf_threshold]
        logger.info(f"After confidence filter (>={conf_threshold}): {len(filtered)} of {len(all_matches_ds)} matches retained.")
        if len(filtered) < 4:
            filtered = sorted(all_matches_ds, key=lambda m: -m[4])[:max(20, len(all_matches_ds))]

        A_ds = None
        inliers_mask = [0] * len(filtered)

        if len(filtered) >= 3:
            src_pts_ds = np.float32([[m[0], m[1]] for m in filtered]).reshape(-1, 1, 2)
            dst_pts_ds = np.float32([[m[2], m[3]] for m in filtered]).reshape(-1, 1, 2)

            gv = self.config.get("geometric_verification", {}).get("ransac", {})
            ransac_thresh = gv.get("threshold", 3.0)
            ransac_iters = gv.get("max_iters", 10000)
            ransac_conf = gv.get("confidence", 0.999)
            A_ds, mask = cv2.estimateAffine2D(src_pts_ds, dst_pts_ds, method=cv2.RANSAC, ransacReprojThreshold=ransac_thresh, maxIters=ransac_iters, confidence=ransac_conf)
            inliers_mask = mask.ravel().tolist() if mask is not None else [0] * len(filtered)
            n_inliers = sum(inliers_mask)
            logger.info(f"Affine RANSAC: {n_inliers} inliers from {len(filtered)} candidates.")

            if A_ds is not None:
                det_2x2 = A_ds[0, 0] * A_ds[1, 1] - A_ds[0, 1] * A_ds[1, 0]
                _, svds, _ = np.linalg.svd(A_ds[:2, :2])
                min_s, max_s = min(svds), max(svds)
                logger.info(f"Affine quality: det={det_2x2:.3f}, scale=({min_s:.3f}, {max_s:.3f})")
                sanity = self.config.get("geometric_verification", {}).get("sanity", {})
                if det_2x2 < sanity.get("min_determinant", 0.1) or min_s < sanity.get("min_scale", 0.2) or max_s > sanity.get("max_scale", 5.0) or n_inliers < sanity.get("min_inliers", 5):
                    logger.warning(f"Rejecting degenerate affine: det={det_2x2:.2f}, scale=({min_s:.2f}, {max_s:.2f}), inliers={n_inliers}")
                    A_ds = None
                    inliers_mask = [0] * len(filtered)

        inliers_ds = [m for i, m in enumerate(filtered) if inliers_mask[i] == 1]

        # Map to native crop pixel space: TMC-2 stays as-is, OHRC scales back up
        raw_matches = [(m[0], m[1], m[2] * scale_factor, m[3] * scale_factor, m[4]) for m in all_matches_ds]
        inliers = [(m[0], m[1], m[2] * scale_factor, m[3] * scale_factor, m[4]) for m in inliers_ds]

        # Build native-space homography (3x3) from the affine: TMC-2 crop → OHRC crop
        H = None
        if A_ds is not None:
            S_up = np.array([[scale_factor, 0, 0], [0, scale_factor, 0], [0, 0, 1]], dtype=np.float64)
            H_ds = np.vstack([A_ds, [0, 0, 1]])
            H = S_up @ H_ds

        # Retrieve offsets to map local crop coordinates back to absolute native coordinates
        t_off_x, t_off_y = 0, 0
        o_off_x, o_off_y = 0, 0
        if pair.geographic_overlap:
            t_off_x, t_off_y = pair.geographic_overlap.get("tmc2_offset", (0, 0))
            o_off_x, o_off_y = pair.geographic_overlap.get("ohrc_offset", (0, 0))

        # Raw matches CSV
        raw_headers = ["pair_id", "source_sensor", "reference_sensor", "source_x", "source_y", "reference_x", "reference_y", "score"]
        with open(match_dir / "matches_raw.csv", "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(raw_headers)
            for m in raw_matches:
                writer.writerow([pair.pair_id, "TMC2", "OHRC", m[0] + t_off_x, m[1] + t_off_y, m[2] + o_off_x, m[3] + o_off_y, m[4]])

        # Inlier matches CSV
        with open(match_dir / "matches_inliers.csv", "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(raw_headers)
            for m in inliers:
                writer.writerow([pair.pair_id, "TMC2", "OHRC", m[0] + t_off_x, m[1] + t_off_y, m[2] + o_off_x, m[3] + o_off_y, m[4]])

        return {"raw_count": len(raw_matches), "inlier_count": len(inliers), "final_count": len(inliers), "H": H, "inliers": inliers}

    def _register_images(self, out_dir: Path, pair: ImagePair, H: np.ndarray):
        logger.info("Estimating transformation and warping images...")
        reg_dir = out_dir / "registration"
        
        if H is not None:
            transform = {"type": "homography", "matrix": H.tolist(), "source": "TMC2", "reference": "OHRC"}
        else:
            transform = {"type": "failed", "matrix": None}
            
        with open(reg_dir / "transform.json", "w") as f:
            json.dump(transform, f, indent=4)
            
        if H is not None:
            t_norm = cv2.normalize(pair.tmc2_image, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
            h, w = pair.ohrc_image.shape
            registered = cv2.warpPerspective(t_norm, H, (w, h))
            cv2.imwrite(str(reg_dir / "registered.tif"), registered)

    def _evaluate_and_save_metrics(self, pair: ImagePair, matches_info: dict, out_dir: Path) -> dict:
        logger.info("Calculating evaluation metrics...")
        solar_diffs = pair.get_solar_differences()
        
        inlier_ratio = matches_info["inlier_count"] / matches_info["raw_count"] if matches_info["raw_count"] > 0 else 0
        
        inliers = matches_info.get("inliers", [])
        H = matches_info.get("H", None)
        
        # Only compute RMSE if we have >4 inliers. If exactly 4, the homography 
        # is perfectly overfitted, so residual error is trivially 0.0.
        if H is not None and len(inliers) > 4:
            src_pts = np.float32([[m[0], m[1]] for m in inliers]).reshape(-1, 1, 2)
            dst_pts = np.float32([[m[2], m[3]] for m in inliers]).reshape(-1, 1, 2)
            projected_pts = cv2.perspectiveTransform(src_pts, H)
            errors = np.linalg.norm(projected_pts - dst_pts, axis=2)
            rmse_pixels = float(np.sqrt(np.mean(errors**2)))
            
            res_m = pair.ohrc_metadata.resolution_m if pair.ohrc_metadata and pair.ohrc_metadata.resolution_m else 0.3
            rmse_meters = rmse_pixels * res_m
        else:
            rmse_pixels = None
            rmse_meters = None
            
        grid_rows = self.config.get("uniform_distribution", {}).get("grid_rows", 8)
        grid_cols = self.config.get("uniform_distribution", {}).get("grid_cols", 8)
        h_o, w_o = pair.ohrc_image.shape
        occupied_cells = set()
        for m in inliers:
            r = min(int(m[3] / (h_o / grid_rows)), grid_rows - 1)
            c = min(int(m[2] / (w_o / grid_cols)), grid_cols - 1)
            occupied_cells.add((r, c))
            
        occupied_count = len(occupied_cells)
        coverage_ratio = occupied_count / (grid_rows * grid_cols)
        
        metrics = {
            "candidate_match_count": matches_info["raw_count"],
            "inlier_count": matches_info["inlier_count"],
            "final_correspondence_count": matches_info["final_count"],
            "inlier_ratio": inlier_ratio,
            "rmse_pixels": round(rmse_pixels, 4) if rmse_pixels is not None else None,
            "rmse_meters": round(rmse_meters, 4) if rmse_meters is not None else None,
            "spatial_coverage_ratio": round(coverage_ratio, 4),
            "occupied_grid_cells": occupied_count,
            "solar_geometry": {
                "tmc2": {"azimuth": pair.tmc2_metadata.solar_azimuth, "elevation": pair.tmc2_metadata.solar_elevation, "incidence": pair.tmc2_metadata.solar_incidence},
                "ohrc": {"azimuth": pair.ohrc_metadata.solar_azimuth, "elevation": pair.ohrc_metadata.solar_elevation, "incidence": pair.ohrc_metadata.solar_incidence},
                "difference": solar_diffs
            }
        }
        
        with open(out_dir / "metrics.json", "w") as f:
            json.dump(metrics, f, indent=4)
            
        return metrics

    def _generate_visualizations(self, out_dir: Path, pair: ImagePair, inliers: list, H: np.ndarray = None):
        logger.info("Generating evaluation visualizations...")
        vis_dir = out_dir / "visualization"

        t_norm = cv2.normalize(pair.tmc2_image, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        o_norm = cv2.normalize(pair.ohrc_image, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)

        th, tw = t_norm.shape[:2]
        oh, ow = o_norm.shape[:2]

        # Registration overlay: warp TMC-2 into OHRC space, blend where data exists
        if H is not None:
            registered = cv2.warpPerspective(t_norm, H, (ow, oh))
            reg_mask = registered > 0
            blend = o_norm.copy()
            blend[reg_mask] = cv2.addWeighted(registered, 0.5, o_norm, 0.5, 0)[reg_mask]
            vis_size = 600
            overlay_small = cv2.resize(blend, (vis_size, vis_size))
            cv2.imwrite(str(vis_dir / "overlay.png"), overlay_small)

            # Checkerboard overlay for alignment assessment
            block = max(oh // 30, 50)
            checker = np.zeros_like(o_norm)
            for i in range(0, oh, block):
                for j in range(0, ow, block):
                    bi, bj = i // block, j // block
                    ie, je = min(i + block, oh), min(j + block, ow)
                    if (bi + bj) % 2 == 0:
                        checker[i:ie, j:je] = registered[i:ie, j:je]
                    else:
                        checker[i:ie, j:je] = o_norm[i:ie, j:je]
            checker_small = cv2.resize(checker, (vis_size, vis_size))
            cv2.imwrite(str(vis_dir / "checkerboard.png"), checker_small)
        else:
            o_resized = cv2.resize(o_norm, (tw, th), interpolation=cv2.INTER_AREA)
            overlay = cv2.addWeighted(t_norm, 0.5, o_resized, 0.5, 0)
            cv2.imwrite(str(vis_dir / "overlay.png"), overlay)

        # Side-by-side match visualization: both panels at same pixel size
        vis_h = 500
        t_vis = cv2.resize(t_norm, (vis_h, vis_h))
        o_vis = cv2.resize(o_norm, (vis_h, vis_h))
        t_color = cv2.cvtColor(t_vis, cv2.COLOR_GRAY2BGR)
        o_color = cv2.cvtColor(o_vis, cv2.COLOR_GRAY2BGR)
        vis_img = np.hstack((t_color, o_color))

        for m in inliers[:80]:
            src_x = int(m[0] * vis_h / tw)
            src_y = int(m[1] * vis_h / th)
            dst_x = int(m[2] * vis_h / ow) + vis_h
            dst_y = int(m[3] * vis_h / oh)

            cv2.line(vis_img, (src_x, src_y), (dst_x, dst_y), (0, 255, 0), 1)
            cv2.circle(vis_img, (src_x, src_y), 4, (0, 0, 255), -1)
            cv2.circle(vis_img, (dst_x, dst_y), 4, (255, 0, 0), -1)

        cv2.imwrite(str(vis_dir / "inlier_matches.png"), vis_img)
