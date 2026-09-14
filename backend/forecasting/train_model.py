import os
import sys
import pickle

import numpy as np
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

TRAINING_RATIO = 0.80

MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "demand_forecast_model.pkl"
)


# ============================================================
# ENVIRONMENT
# ============================================================

def load_mongo_uri():
    """
    Read MONGO_URI from environment variables.
    """

    mongo_uri = os.getenv("MONGO_URI")

    if not mongo_uri:
        print("❌ MONGO_URI is missing.")
        sys.exit(1)

    return mongo_uri


# ============================================================
# LOAD DATA
# ============================================================

def load_forecast_features(client):
    """
    Load engineered forecasting features from MongoDB.
    """

    database = client["test"]

    collection = database["forecastfeatures"]

    documents = list(
        collection.find({})
    )

    if not documents:
        print(
            "❌ No forecast feature records found."
        )

        sys.exit(1)

    print(
        f"Loaded {len(documents)} forecast feature records."
    )

    return pd.DataFrame(documents)


# ============================================================
# PREPARE DATA
# ============================================================

def prepare_data(df):
    """
    Prepare numerical and categorical features.
    """

    df = df.copy()

    # Convert date
    df["saleDate"] = pd.to_datetime(
        df["saleDate"]
    )

    # Sort by SKU and date
    df = df.sort_values(
        ["sku", "saleDate"]
    ).reset_index(drop=True)

    # Preserve original SKU for time-based splitting.
    # get_dummies() will later replace the original
    # sku column with one-hot encoded columns.
    df["originalSku"] = df["sku"].fillna("UNKNOWN")

    # Keep SKU as a model feature.
    # This allows the model to learn
    # product-specific demand patterns.
    df["sku"] = df["sku"].fillna("UNKNOWN")

    # Convert boolean to integer
    df["promotion"] = df["promotion"].astype(int)
    df["isWeekend"] = df["isWeekend"].astype(int)

    # Fill missing festival values
    df["festival"] = df["festival"].fillna(
        "NoFestival"
    )

    # One-hot encode categorical features
    df = pd.get_dummies(
        df,
        columns=[
            "sku",
            "category",
            "festival",
        ],
        dtype=int
    )

    # Base numerical features
    feature_columns = [
        "sellingPrice",
        "discount",
        "promotion",

        "dayOfWeek",
        "dayOfMonth",
        "month",
        "weekOfYear",
        "isWeekend",

        "lag1",
        "lag7",
        "lag14",
        "lag30",

        "rolling7Average",
        "rolling14Average",
        "rolling30Average",

        "rolling7StdDev",
    ]

    # Add generated categorical columns
    dynamic_columns = [
        column
        for column in df.columns
        if (
            column.startswith("sku_")
            or column.startswith("category_")
            or column.startswith("festival_")
        )
    ]

    feature_columns.extend(
        dynamic_columns
    )

    # Remove duplicates while preserving order
    feature_columns = list(
        dict.fromkeys(feature_columns)
    )

    # Check required features
    missing_columns = [
        column
        for column in feature_columns
        if column not in df.columns
    ]

    if missing_columns:
        print(
            "❌ Missing feature columns:"
        )

        for column in missing_columns:
            print(
                f"   - {column}"
            )

        sys.exit(1)

    X = df[feature_columns].copy()

    y = df["quantitySold"].copy()

    return (
        df,
        X,
        y,
        feature_columns
    )


# ============================================================
# TIME-BASED SPLIT
# ============================================================

def split_data(df, X, y):
    """
    Split each SKU chronologically.

    Each product gets its own 80/20 time-based split.
    This prevents one SKU from appearing entirely
    in training while another SKU appears entirely
    in testing.
    """

    train_indices = []
    test_indices = []

    print(
        "\n========== PER-SKU TIME SPLIT =========="
    )

    for sku, group in df.groupby(
        "originalSku",
        sort=False
    ):
        group_indices = group.index.tolist()

        split_index = int(
            len(group_indices)
            * TRAINING_RATIO
        )

        sku_train_indices = (
            group_indices[:split_index]
        )

        sku_test_indices = (
            group_indices[split_index:]
        )

        train_indices.extend(
            sku_train_indices
        )

        test_indices.extend(
            sku_test_indices
        )

        print(
            f"\n{sku}"
        )

        print(
            f"  Training records: "
            f"{len(sku_train_indices)}"
        )

        print(
            f"  Testing records: "
            f"{len(sku_test_indices)}"
        )

        print(
            f"  Training: "
            f"{df.loc[sku_train_indices, 'saleDate'].min().date()}"
            f" → "
            f"{df.loc[sku_train_indices, 'saleDate'].max().date()}"
        )

        print(
            f"  Testing: "
            f"{df.loc[sku_test_indices, 'saleDate'].min().date()}"
            f" → "
            f"{df.loc[sku_test_indices, 'saleDate'].max().date()}"
        )

    # Preserve chronological order
    train_indices = sorted(
        train_indices,
        key=lambda index: df.loc[
            index,
            "saleDate"
        ]
    )

    test_indices = sorted(
        test_indices,
        key=lambda index: df.loc[
            index,
            "saleDate"
        ]
    )

    X_train = X.loc[
        train_indices
    ]

    X_test = X.loc[
        test_indices
    ]

    y_train = y.loc[
        train_indices
    ]

    y_test = y.loc[
        test_indices
    ]

    print(
        "\n========== FINAL SPLIT =========="
    )

    print(
        f"Training records: "
        f"{len(X_train)}"
    )

    print(
        f"Testing records: "
        f"{len(X_test)}"
    )

    print(
        f"Training start: "
        f"{df.loc[train_indices, 'saleDate'].min().date()}"
    )

    print(
        f"Training end: "
        f"{df.loc[train_indices, 'saleDate'].max().date()}"
    )

    print(
        f"Testing start: "
        f"{df.loc[test_indices, 'saleDate'].min().date()}"
    )

    print(
        f"Testing end: "
        f"{df.loc[test_indices, 'saleDate'].max().date()}"
    )

    return (
        X_train,
        X_test,
        y_train,
        y_test,
        train_indices,
        test_indices
    )


# ============================================================
# BASELINE
# ============================================================

def calculate_baseline(
    df,
    y_test,
    test_indices
):
    """
    Baseline prediction using the
    previous 30-day rolling average.
    """

    baseline_predictions = []

    for index in test_indices:

        row = df.loc[index]

        baseline_predictions.append(
            row["rolling30Average"]
        )

    baseline_predictions = np.array(
        baseline_predictions
    )

    actual = y_test.to_numpy()

    mae = mean_absolute_error(
        actual,
        baseline_predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            baseline_predictions
        )
    )

    return (
        baseline_predictions,
        mae,
        rmse
    )


# ============================================================
# TRAIN MODEL
# ============================================================

def train_model(
    X_train,
    y_train
):
    """
    Train Random Forest regression model.
    """

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train,
        y_train
    )

    return model


# ============================================================
# EVALUATION
# ============================================================

def calculate_metrics(
    predictions,
    y_test
):
    """
    Calculate forecasting accuracy.
    """

    # Demand cannot be negative
    predictions = np.maximum(
        predictions,
        0
    )

    actual = y_test.to_numpy()

    mae = mean_absolute_error(
        actual,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predictions
        )
    )

    total_actual = np.sum(
        np.abs(actual)
    )

    if total_actual == 0:

        wmape = 0

    else:

        wmape = (
            np.sum(
                np.abs(
                    actual - predictions
                )
            )
            / total_actual
        ) * 100

    return (
        predictions,
        mae,
        rmse,
        wmape
    )


# ============================================================
# IMPROVEMENT CALCULATION
# ============================================================

def calculate_improvement(
    baseline_value,
    model_value
):
    """
    Calculate percentage improvement.

    Positive value = model improved.
    Negative value = model became worse.
    """

    if baseline_value == 0:
        return 0

    return (
        (baseline_value - model_value)
        / baseline_value
    ) * 100


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(
    model,
    feature_columns
):
    """
    Save trained model and feature metadata.
    """

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    model_data = {
        "model": model,
        "feature_columns": feature_columns,
    }

    with open(
        MODEL_PATH,
        "wb"
    ) as file:

        pickle.dump(
            model_data,
            file
        )

    print(
        "\n✅ Model saved to:"
    )

    print(
        MODEL_PATH
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print(
        "\n========== SUPPLYSYNC AI FORECAST MODEL ==========\n"
    )

    mongo_uri = load_mongo_uri()

    client = MongoClient(
        mongo_uri
    )

    try:

        # ----------------------------------------------------
        # LOAD DATA
        # ----------------------------------------------------

        df = load_forecast_features(
            client
        )

        # ----------------------------------------------------
        # PREPARE DATA
        # ----------------------------------------------------

        (
            df,
            X,
            y,
            feature_columns
        ) = prepare_data(
            df
        )

        print(
            f"Total features used: "
            f"{len(feature_columns)}"
        )

        # ----------------------------------------------------
        # SPLIT DATA
        # ----------------------------------------------------

        (
            X_train,
            X_test,
            y_train,
            y_test,
            train_indices,
            test_indices
        ) = split_data(
            df,
            X,
            y
        )

        # ----------------------------------------------------
        # BASELINE
        # ----------------------------------------------------

        print(
            "\n========== BASELINE =========="
        )

        (
            baseline_predictions,
            baseline_mae,
            baseline_rmse
        ) = calculate_baseline(
            df,
            y_test,
            test_indices
        )

        print(
            f"Baseline MAE: "
            f"{baseline_mae:.4f}"
        )

        print(
            f"Baseline RMSE: "
            f"{baseline_rmse:.4f}"
        )

        # ----------------------------------------------------
        # TRAIN RANDOM FOREST
        # ----------------------------------------------------

        print(
            "\n========== TRAINING RANDOM FOREST =========="
        )

        model = train_model(
            X_train,
            y_train
        )

        print(
            "Random Forest training completed."
        )

        # ----------------------------------------------------
        # MODEL PREDICTIONS
        # ----------------------------------------------------

        raw_predictions = model.predict(
            X_test
        )

        (
            predictions,
            model_mae,
            model_rmse,
            model_wmape
        ) = calculate_metrics(
            raw_predictions,
            y_test
        )

        # ----------------------------------------------------
        # MODEL RESULTS
        # ----------------------------------------------------

        print(
            "\n========== MODEL RESULTS =========="
        )

        print(
            f"Model MAE: "
            f"{model_mae:.4f}"
        )

        print(
            f"Model RMSE: "
            f"{model_rmse:.4f}"
        )

        print(
            f"Model WMAPE: "
            f"{model_wmape:.2f}%"
        )

        # ----------------------------------------------------
        # IMPROVEMENT
        # ----------------------------------------------------

        mae_improvement = calculate_improvement(
            baseline_mae,
            model_mae
        )

        rmse_improvement = calculate_improvement(
            baseline_rmse,
            model_rmse
        )

        print(
            "\n========== MODEL COMPARISON =========="
        )

        print(
            f"MAE improvement: "
            f"{mae_improvement:.2f}%"
        )

        print(
            f"RMSE improvement: "
            f"{rmse_improvement:.2f}%"
        )

        if model_mae < baseline_mae:

            print(
                "✅ Random Forest beats baseline on MAE."
            )

        else:

            print(
                "⚠️ Random Forest does not beat baseline on MAE."
            )

        if model_rmse < baseline_rmse:

            print(
                "✅ Random Forest beats baseline on RMSE."
            )

        else:

            print(
                "⚠️ Random Forest does not beat baseline on RMSE."
            )

        # ----------------------------------------------------
        # TOP FEATURES
        # ----------------------------------------------------

        importance = pd.DataFrame(
            {
                "feature": feature_columns,
                "importance":
                    model.feature_importances_,
            }
        ).sort_values(
            "importance",
            ascending=False
        )

        print(
            "\n========== TOP FEATURES =========="
        )

        for _, row in importance.head(
            10
        ).iterrows():

            print(
                f"{row['feature']}: "
                f"{row['importance']:.4f}"
            )

        # ----------------------------------------------------
        # SAVE MODEL
        # ----------------------------------------------------

        save_model(
            model,
            feature_columns
        )

        print(
            "\n==============================================="
        )

        print(
            "✅ FORECAST MODEL TRAINING COMPLETED"
        )

        print(
            "===============================================\n"
        )

    finally:

        client.close()


if __name__ == "__main__":
    main()