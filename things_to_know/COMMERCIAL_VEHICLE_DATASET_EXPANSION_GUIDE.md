# Commercial & Passenger Vehicle Dataset Expansion — Status: ROLLED BACK / PURGED

> [!CAUTION]
> **STATUS: DISCARDED & PURGED**
> The automated pseudo-labeling / auto-harvested data was discarded and purged from `SENTINEL_MEGA_GUJARAT_TRAFFIC_DATASET` following visual verification due to labeling inaccuracies.
> 
> The dataset has been cleanly restored to its **original pristine state**:
> - **Train Images**: 1,687 images (1,687 labels)
> - **Validation Images**: 351 images (351 labels)
> - **Total**: 2,038 authentic, verified images
> - All `harvest_*` files and generation scripts have been completely deleted.

---

## Recommended Accurate Alternatives for Commercial Vehicle Improvement:
1. **Manual / Semi-Supervised Annotation with CVAT/Roboflow**: Export raw frames of buses and trucks and verify bounding box ground-truth manually.
2. **Transfer Learning / Multi-Model Feature Fusion**: Use high-confidence pretrained vehicle backbones without mixing noisy pseudo-labels into the primary ground truth.
3. **Class-Weighted Loss**: Increase class weights for `passenger_vehicle` and `goods_vehicle` during training on the clean 2,038 dataset to penalize misses without injecting noisy labels.
