# CLAUDE.md — CMI Detect Behavior with Sensor Data

## Project Overview

This is a **machine learning / data science research project** focused on detecting human behaviors and gestures from multi-modal wearable sensor data. It is a Kaggle-style competition notebook project written entirely in Python using Jupyter Notebooks.

**Goal**: Classify human behavioral phases (`behavior`, `phase`, `gesture`) from time-series readings of accelerometer, rotation, thermal, and time-of-flight sensors worn on the body, combined with subject demographic data.

---

## Repository Structure

```
CMI---Data-Behavior-with-Sensor-Data/
├── CLAUDE.md                                           # This file
├── 002_CMI-Detect_Behavior_with_Sensor_Data.code-workspace  # VS Code workspace config
├── CMI-Detect_Behavior_with_Sensor_Data_20250803.ipynb      # Primary analysis notebook (Aug 3)
├── CMI-Detect_Behavior_No3_20250804.ipynb                    # Iteration notebook (Aug 4)
├── CMI-Detect_Behavior_No4_20250805.ipynb                    # Iteration notebook (Aug 5)
└── test_20250801.ipynb                                       # Early exploratory notebook (Aug 1)
```

There are no Python package files (`requirements.txt`, `pyproject.toml`, `setup.py`) or build scripts. Dependencies are managed implicitly within the notebooks.

---

## Notebooks

All work is done in Jupyter Notebooks. The notebooks are numbered/dated to reflect the iteration history:

| Notebook | Date | Notes |
|---|---|---|
| `test_20250801.ipynb` | Aug 1, 2025 | Initial exploration |
| `CMI-Detect_Behavior_with_Sensor_Data_20250803.ipynb` | Aug 3, 2025 | Primary baseline |
| `CMI-Detect_Behavior_No3_20250804.ipynb` | Aug 4, 2025 | Iteration 3 |
| `CMI-Detect_Behavior_No4_20250805.ipynb` | Aug 5, 2025 | Iteration 4 (latest) |

**Naming convention**: New notebooks are named with a sequential number suffix (`No3`, `No4`, …) and the date (`YYYYMMDD`).

---

## Data

Data files are **not committed to the repository** and must be placed locally. The notebooks expect them at a hardcoded Windows path:

```python
datafol = r"C:\Users\jouji\MyProjects\03_data\002_CMI-Detect_Behavior_with_Sensor_Data"
```

When working on a different machine, update `datafol` to the local data directory before running any cells.

### Required Data Files

| File | Rows | Description |
|---|---|---|
| `train.csv` | 574,945 | Training sensor readings with behavior labels |
| `train_demographics.csv` | 81 | Demographics for 81 training subjects |
| `test.csv` | 107 | Test sensor readings (no labels) |
| `test_demographics.csv` | 2 | Demographics for 2 test subjects |

### Training Data Schema (`train.csv`)

**Identifier columns:**
- `row_id` — unique row identifier (e.g., `SEQ_000007_000000`)
- `sequence_id` — sequence identifier (e.g., `SEQ_000007`)
- `sequence_counter` — position within the sequence (integer, starting from 0)
- `subject` — subject identifier (e.g., `SUBJ_059520`)

**Label columns (training only):**
- `sequence_type` — `"Target"` or `"Non-Target"`
- `orientation` — body position (e.g., `"Seated Lean Non Dom - FACE DOWN"`)
- `behavior` — high-level behavior description (e.g., `"Relaxes and moves hand to target location"`)
- `phase` — `"Transition"` or `"Gesture"`
- `gesture` — specific gesture name (e.g., `"Cheek - pinch skin"`, `"Write name on leg"`)

**Sensor columns (336 total):**
- `acc_x`, `acc_y`, `acc_z` — accelerometer (3 axes)
- `rot_w`, `rot_x`, `rot_y`, `rot_z` — rotation quaternion (4 components)
- `thm_1` … `thm_5` — thermal sensors (5 sensors)
- `tof_1_v0` … `tof_5_v63` — time-of-flight sensors (5 sensors × 64 voxels each = 320 columns)

**Missing value encoding**: `-1` is used as a sentinel for missing/invalid sensor readings throughout the dataset.

### Demographics Schema (`train_demographics.csv` / `test_demographics.csv`)

| Column | Type | Description |
|---|---|---|
| `subject` | string | Subject ID |
| `adult_child` | int | `0` = child, `1` = adult |
| `age` | int | Age in years |
| `sex` | int | `0` or `1` |
| `handedness` | int | `0` or `1` |
| `height_cm` | float | Height in centimeters |
| `shoulder_to_wrist_cm` | float | Shoulder-to-wrist length (cm) |
| `elbow_to_wrist_cm` | float | Elbow-to-wrist length (cm) |

---

## Standard Notebook Workflow

Each notebook follows this cell execution order:

1. **Import libraries** — `pandas`, `sklearn`, etc.
2. **Disable system sleep** (Windows-specific):
   ```python
   import ctypes
   ES_CONTINUOUS = 0x80000000
   ES_SYSTEM_REQUIRED = 0x00000001
   ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
   ```
   This prevents the machine from sleeping during long training runs. On non-Windows systems, omit or replace this.
3. **Set data folder path** — update `datafol` to your local data directory.
4. **Load CSV files** into DataFrames:
   - `train_df`, `train_demographics_df`, `test_df`, `test_demographics_df`
5. **Merge demographics** into `train_df` (row-by-row join on `subject`):
   ```python
   for idx, row in train_demographics_df.iterrows():
       train_df.loc[train_df["subject"] == row["subject"], "adult_child"] = row["adult_child"]
       # ... other demographic columns
   ```
   Note: This approach triggers a `FutureWarning` in recent pandas versions about dtype incompatibility (e.g., float values into int64 columns). Use `pd.merge()` or explicit dtype casting to avoid this.
6. **Feature engineering** — compute per-sequence aggregate statistics:
   ```python
   for colname in train_df.columns[9:21]:  # acc and rot columns
       train_df[f'{colname}_mean'] = (
           train_df.groupby(['sequence_id', 'subject'])[colname].transform('mean')
       )
   ```
   This adds `_mean` suffix columns for `acc_x` through `thm_5` (12 columns → 12 new mean columns).
7. **Model training** — Stratified K-Fold cross-validation:
   ```python
   from sklearn.ensemble import RandomForestClassifier
   from sklearn.model_selection import StratifiedKFold
   from sklearn.metrics import accuracy_score

   skf = StratifiedKFold(n_splits=3)
   for fold, (train_idx, val_idx) in enumerate(skf.split(train_df, train_df["behavior"])):
       # feature_cols = all columns starting with 'acc_', 'rot_', 'thm_', 'tof_'
       # Replace -1 with 0 for missing values
       # Fit RandomForestClassifier
       # Print accuracy score
   ```

### Feature Selection Convention

Features are selected by column name prefix:
```python
feature_cols = [col for col in train_data.columns if col.startswith(('acc_', 'rot_', 'thm_', 'tof_'))]
```
This automatically includes the original sensor readings **and** any `_mean` engineered features added earlier.

### Missing Value Handling Convention

Replace `-1` sentinel values with `0` before model training:
```python
X_train = X_train.replace(-1, 0)
```

---

## Baseline Model Performance

Random Forest Classifier with 3-fold Stratified K-Fold cross-validation on `behavior` target:

```
Accuracy: 0.678
Accuracy: 0.674
Accuracy: 0.674
```

This serves as the baseline to beat. The primary evaluation metric is **accuracy**.

---

## Code Conventions

- **Language**: Python 3 in Jupyter Notebooks
- **Comments**: Mixed Japanese and English (primary developer is Japanese-speaking). Japanese comments are common in code cells — do not remove them.
- **No linting** or formatting tools are enforced (no `.flake8`, `black`, `isort`, etc.).
- **No type hints** are used.
- **Notebook naming**: `CMI-Detect_Behavior_No{N}_{YYYYMMDD}.ipynb` for iterations.
- **Variable naming**: Uses `snake_case` with descriptive names (`train_df`, `test_demographics_df`, `feature_cols`).

---

## Known Issues and Gotchas

1. **Hardcoded Windows path**: `datafol` must be updated per machine. There is no `.env` or config file.
2. **Demographic merge performance**: The row-by-row `for` loop merge is very slow for large DataFrames. Prefer `pd.merge()`:
   ```python
   train_df = train_df.merge(train_demographics_df, on='subject', how='left')
   ```
3. **FutureWarning from pandas**: Assigning float values to int64 columns. Explicitly define column dtypes as float when initializing, or use the merge approach above.
4. **Windows-only sleep disable**: The `ctypes.windll` call will fail on Linux/macOS. Guard it or remove it.
5. **No reproducibility seed**: `RandomForestClassifier()` is called without `random_state`. Add `random_state=42` for reproducible results.
6. **-1 as missing value**: Replacing `-1` with `0` is a simple imputation strategy. More sophisticated imputation (median, model-based) may improve results.

---

## Development Environment

- **IDE**: VS Code with Jupyter extension (`.code-workspace` file provided)
- **Platform**: Developed on Windows; path separators use `\` in hardcoded paths
- **Python**: Standard data science stack — `pandas`, `scikit-learn`

### Recommended Setup (cross-platform)

```bash
pip install pandas scikit-learn notebook
jupyter notebook
```

---

## Potential Improvements to Explore

Based on the current notebook state, these areas are natural next steps:

- **Better missing value imputation** for `-1` sentinel values (e.g., per-sensor median)
- **Additional feature engineering**: sequence-level statistics (std, min, max, percentiles) for sensor columns
- **TOF voxel aggregation**: The 320 TOF columns (5 sensors × 64 voxels) are high-dimensional — consider PCA or mean/max pooling per sensor
- **Time-series features**: Sequence position (`sequence_counter`) and temporal deltas
- **Gradient boosting models**: LightGBM or XGBoost as alternatives to Random Forest
- **Multi-target prediction**: The dataset has multiple targets (`behavior`, `phase`, `gesture`) — could train separate models or use multi-output classifiers
- **Subject-aware cross-validation**: Fold by `subject` to test generalization to unseen subjects
- **Demographic features**: Current merge adds them but they are not always included in `feature_cols` — verify they are included
