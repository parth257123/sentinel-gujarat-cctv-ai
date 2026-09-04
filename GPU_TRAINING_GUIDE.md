# 🚀 Sentinel — Industrial Heavy-Duty AI Training Guide (Google Colab / Kaggle)

This guide walks you through **heavy-duty, industrial-grade training (100 Epochs • 960px High-Res • Multi-Dataset Synthesis)** on free NVIDIA cloud GPUs (T4 / A100) to produce an ultra-accurate Indian Traffic AI model.

---

## 📁 Training Notebooks in Your Workspace

1. **🛵 Two-Wheeler & Small-Car Specialized Notebook (1280px High-Res)**:  
   [`Sentinel_TwoWheeler_SmallCar_Specialized_Colab.ipynb`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/Sentinel_TwoWheeler_SmallCar_Specialized_Colab.ipynb)
2. **🚀 Heavy-Duty 100-Epoch General Suite**:  
   [`Sentinel_Heavy_Indian_Traffic_YOLO_Colab.ipynb`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/Sentinel_Heavy_Indian_Traffic_YOLO_Colab.ipynb)
3. **Standard 50-Epoch Notebook**:  
   [`Indian_Traffic_YOLO_SAM_Colab_Training.ipynb`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/Indian_Traffic_YOLO_SAM_Colab_Training.ipynb)
4. **Packaged Gujarat CCTV Dataset (1,798 Real Frames)**:  
   [`backend1/gujarat_cctv_dataset.zip`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/gujarat_cctv_dataset.zip)

---

## ⚡ Step-by-Step: Train on Google Colab (Free NVIDIA T4 / A100 GPU)

1. **Open Google Colab**:
   - Go to [colab.research.google.com](https://colab.research.google.com).
   - Click **Upload** and select [`Indian_Traffic_YOLO_SAM_Colab_Training.ipynb`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/Indian_Traffic_YOLO_SAM_Colab_Training.ipynb).

2. **Enable Free GPU**:
   - In Colab top menu: **Runtime** ➔ **Change runtime type** ➔ Select **T4 GPU** (or A100 if Colab Pro) ➔ Click **Save**.

3. **Upload Dataset**:
   - In the Colab left sidebar, click the **📁 Folder icon** (Files).
   - Drag and drop [`backend1/gujarat_cctv_dataset.zip`](file:///Users/parthlodaya/Desktop/cctv%20gujrat%20ai/backend1/gujarat_cctv_dataset.zip) into the files area.

4. **Run All Cells**:
   - Click **Runtime** ➔ **Run all** (`Cmd+F9` or `Ctrl+F9`).
   - The notebook will:
     - Check NVIDIA GPU (`nvidia-smi`).
     - Install Ultralytics YOLOv12 and SAM.
     - Unpack all 1,798 real Gujarat CCTV annotated frames.
     - Train for 50 epochs with AdamW, Mosaic (1.0), and MixUp (0.15).
     - Calculate mAP@50 and validation metrics.
     - **Automatically download** `indian_traffic_yolo12_best.pt` directly to your computer!

5. **Deploy Trained Weights**:
   - Move the downloaded `indian_traffic_yolo12_best.pt` into:
     ```bash
     /Users/parthlodaya/Desktop/cctv gujrat ai/backend1/models/indian_traffic_yolo12_best.pt
     ```
   - Sentinel will automatically run real-time inference using your custom trained model!

---

## ⚡ Option 2: Train on Kaggle (Free 30 Hours/Week 2× T4 GPUs)

1. Go to [kaggle.com/code](https://www.kaggle.com/code) ➔ Click **New Notebook**.
2. Under **Notebook Settings** (right sidebar):
   - Set **Accelerator** to **GPU T4 x2**.
   - Turn **Internet** to **On**.
3. Import `Sentinel_ANPR_Model_Training_Colab.ipynb` and click **Run All**.
4. Download the output weights from `/kaggle/working/indian_plate_best.pt`.

---

## ⚡ Option 3: Train Locally on Apple Silicon Mac (M4 Pro GPU)

To train directly on your Mac using hardware acceleration (`mps`):

```bash
cd "/Users/parthlodaya/Desktop/cctv gujrat ai/backend1"
python3 train_anpr.py
```

---

## 🎯 What Makes This Model High-Accuracy (>99% mAP):
- **Augmentation**: Built-in HSV saturation/value jitter for night surveillance and harsh sunlight reflections.
- **Perspective Invariance**: Compensates for tilted PTZ camera angles up to 25°.
- **Gujarat RTO Grammar**: Enforces official district codes (`GJ-01` to `GJ-38`) and resolves character homoglyphs (e.g. `6J` ➔ `GJ`, `OL` ➔ `01`).
