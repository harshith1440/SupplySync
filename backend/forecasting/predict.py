import os
import sys
import pickle
import json
from datetime import timedelta

import numpy as np
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "demand_forecast_model.pkl"
)

FORECAST_DAYS = 7
HISTORY_DAYS = 30


# ============================================================
# ENVIRONMENT
# ============================================================

def load_mongo_uri():
    """
    Read MongoDB connection string.
    """

    mongo_uri = os.getenv("MONGO_URI")

    if not mongo_uri:
        print(
            "❌ MONGO_URI is missing.",
            file=sys.stderr
        )

        sys.exit(1)

    return mongo_uri


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():
    """
    Load the trained Random Forest model.
    """

    if not os.path.exists(MODEL_PATH):

        print(
            "❌ Trained model not found.",
            file=sys.stderr
        )

        print(
            f"Expected location: {MODEL_PATH}",
            file=sys.stderr
        )

        sys.exit(1)

    with open(
        MODEL_PATH,
        "rb"
    ) as file:

        model_data = pickle.load(file)

    return (
        model_data["model"],
        model_data["feature_columns"]
    )


# ============================================================
# LOAD DATA
# ============================================================

def load_latest_features(
    database,
    sku
):
    """
    Load the latest historical forecast
    feature records for a SKU.
    """

    collection = database["forecastfeatures"]

    documents = list(
        collection.find(
            {
                "sku": sku
            }
        )
        .sort(
            "saleDate",
            -1
        )
        .limit(HISTORY_DAYS)
    )

    if len(documents) < HISTORY_DAYS:

        print(
            f"❌ Not enough historical feature data "
            f"for SKU {sku}.",
            file=sys.stderr
        )

        print(
            f"Found {len(documents)} records. "
            f"Need at least {HISTORY_DAYS}.",
            file=sys.stderr
        )

        sys.exit(1)

    # Convert to chronological order
    documents.reverse()

    return documents


# ============================================================
# FESTIVAL
# ============================================================

def get_festival(date):
    """
    Return the known festival for a date.
    """

    festivals = {
        "2025-10-02": "Dussehra",
        "2025-10-20": "Diwali",
        "2026-03-04": "Holi",
        "2026-03-19": "Ugadi",
        "2026-03-20": "Eid",
    }

    return festivals.get(
        date.strftime("%Y-%m-%d"),
        "NoFestival"
    )


# ============================================================
# WEEK OF YEAR
# ============================================================

def get_week_of_year(date):
    """
    Match the week-of-year representation
    used during training.
    """

    return int(
        date.isocalendar().week
    )


# ============================================================
# BUILD MODEL INPUT
# ============================================================

def build_feature_row(
    date,
    sku,
    category,
    selling_price,
    discount,
    promotion,
    historical_demand,
    feature_columns
):
    """
    Build the exact feature row expected
    by the trained Random Forest model.
    """

    # --------------------------------------------------------
    # Historical demand
    # --------------------------------------------------------

    lag1 = historical_demand[-1]

    lag7 = historical_demand[-7]

    lag14 = historical_demand[-14]

    lag30 = historical_demand[-30]

    last_7 = np.array(
        historical_demand[-7:],
        dtype=float
    )

    last_14 = np.array(
        historical_demand[-14:],
        dtype=float
    )

    last_30 = np.array(
        historical_demand[-30:],
        dtype=float
    )

    rolling7_average = np.mean(
        last_7
    )

    rolling14_average = np.mean(
        last_14
    )

    rolling30_average = np.mean(
        last_30
    )

    rolling7_std_dev = np.std(
        last_7
    )

    # --------------------------------------------------------
    # Calendar features
    # --------------------------------------------------------

    day_of_week = date.weekday()

    day_of_month = date.day

    month = date.month

    week_of_year = get_week_of_year(
        date
    )

    is_weekend = int(
        day_of_week >= 5
    )

    festival = get_festival(
        date
    )

    # --------------------------------------------------------
    # Create base feature row
    # --------------------------------------------------------

    row = {
        "sellingPrice": selling_price,
        "discount": discount,
        "promotion": int(promotion),

        "dayOfWeek": day_of_week,
        "dayOfMonth": day_of_month,
        "month": month,
        "weekOfYear": week_of_year,
        "isWeekend": is_weekend,

        "lag1": lag1,
        "lag7": lag7,
        "lag14": lag14,
        "lag30": lag30,

        "rolling7Average":
            rolling7_average,

        "rolling14Average":
            rolling14_average,

        "rolling30Average":
            rolling30_average,

        "rolling7StdDev":
            rolling7_std_dev,
    }

    # --------------------------------------------------------
    # SKU one-hot encoding
    # --------------------------------------------------------

    for column in feature_columns:

        if column.startswith("sku_"):

            sku_value = column[
                len("sku_"):
            ]

            row[column] = int(
                sku == sku_value
            )

    # --------------------------------------------------------
    # Category one-hot encoding
    # --------------------------------------------------------

    for column in feature_columns:

        if column.startswith(
            "category_"
        ):

            category_value = column[
                len("category_"):
            ]

            row[column] = int(
                category == category_value
            )

    # --------------------------------------------------------
    # Festival one-hot encoding
    # --------------------------------------------------------

    for column in feature_columns:

        if column.startswith(
            "festival_"
        ):

            festival_value = column[
                len("festival_"):
            ]

            row[column] = int(
                festival == festival_value
            )

    # --------------------------------------------------------
    # Make sure every feature exists
    # --------------------------------------------------------

    for column in feature_columns:

        if column not in row:

            row[column] = 0

    # Return features in exact training order
    return [
        row[column]
        for column in feature_columns
    ]


# ============================================================
# GENERATE FORECAST
# ============================================================

def generate_forecast(
    database,
    sku,
    model,
    feature_columns
):
    """
    Generate recursive 7-day demand forecast.
    """

    historical_features = load_latest_features(
        database,
        sku
    )

    latest_record = historical_features[-1]

    # --------------------------------------------------------
    # Historical statistics
    # --------------------------------------------------------

    historical_demand = [
        float(
            record["quantitySold"]
        )
        for record in historical_features
    ]

    historical_days_used = len(
        historical_demand
    )

    total_historical_demand = sum(
        historical_demand
    )

    average_daily_demand = (
        total_historical_demand
        / historical_days_used
    )

    # --------------------------------------------------------
    # Product information
    # --------------------------------------------------------

    category = latest_record.get(
        "category",
        "groceries"
    )

    selling_price = latest_record.get(
        "sellingPrice",
        0
    )

    discount = latest_record.get(
        "discount",
        0
    )

    promotion = latest_record.get(
        "promotion",
        False
    )

    # --------------------------------------------------------
    # Last historical date
    # --------------------------------------------------------

    last_date = pd.to_datetime(
        latest_record["saleDate"]
    ).date()

    # --------------------------------------------------------
    # Generate next 7 days
    # --------------------------------------------------------

    forecasts = []

    for day in range(
        1,
        FORECAST_DAYS + 1
    ):

        forecast_date = (
            last_date
            + timedelta(days=day)
        )

        feature_row = build_feature_row(
            date=forecast_date,
            sku=sku,
            category=category,
            selling_price=selling_price,
            discount=discount,
            promotion=promotion,
            historical_demand=historical_demand,
            feature_columns=feature_columns
        )

        X_future = pd.DataFrame(
            [feature_row],
            columns=feature_columns
        )

        prediction = model.predict(
            X_future
        )[0]

        # Demand cannot be negative
        prediction = max(
            0,
            float(prediction)
        )

        prediction = round(
            prediction,
            2
        )

        forecasts.append(
            {
                "date":
                    forecast_date.strftime(
                        "%Y-%m-%d"
                    ),
                "predictedDemand":
                    prediction,
            }
        )

        # ----------------------------------------------------
        # Recursive forecasting
        # ----------------------------------------------------

        historical_demand.append(
            prediction
        )

    # --------------------------------------------------------
    # Return complete forecast response
    # --------------------------------------------------------

    return {
        "sku": sku,

        "productName":
            latest_record.get(
                "productName",
                sku
            ),

        "category":
            category,

        "model":
            "Random Forest demand forecasting model",

        "historicalDaysUsed":
            historical_days_used,

        "totalHistoricalDemand":
            total_historical_demand,

        "averageDailyDemand":
            round(
                average_daily_demand,
                2
            ),

        "forecastDays":
            FORECAST_DAYS,

        "forecast":
            forecasts,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    # --------------------------------------------------------
    # SKU argument
    # --------------------------------------------------------

    if len(sys.argv) < 2:

        print(
            "❌ SKU is required.",
            file=sys.stderr
        )

        print(
            "Example: "
            "python3 forecasting/predict.py ATTA-5KG",
            file=sys.stderr
        )

        sys.exit(1)

    sku = sys.argv[1].upper()

    # --------------------------------------------------------
    # JSON mode
    # --------------------------------------------------------

    json_mode = (
        len(sys.argv) >= 3
        and sys.argv[2] == "--json"
    )

    try:

        # ----------------------------------------------------
        # Load model
        # ----------------------------------------------------

        model, feature_columns = load_model()

        # ----------------------------------------------------
        # Connect MongoDB
        # ----------------------------------------------------

        mongo_uri = load_mongo_uri()

        client = MongoClient(
            mongo_uri
        )

        try:

            database = client["test"]

            # ------------------------------------------------
            # Generate forecast
            # ------------------------------------------------

            result = generate_forecast(
                database,
                sku,
                model,
                feature_columns
            )

        finally:

            client.close()

        # ----------------------------------------------------
        # JSON response
        # ----------------------------------------------------

        if json_mode:

            print(
                json.dumps(
                    result
                )
            )

        # ----------------------------------------------------
        # Terminal response
        # ----------------------------------------------------

        else:

            print(
                "\n========== SUPPLYSYNC AI ML FORECAST ==========\n"
            )

            print(
                f"Generating forecast for: {sku}"
            )

            print(
                "✅ Trained model loaded."
            )

            print(
                "\n========== HISTORICAL DATA =========="
            )

            print(
                f"Historical days used: "
                f"{result['historicalDaysUsed']}"
            )

            print(
                f"Total historical demand: "
                f"{result['totalHistoricalDemand']} units"
            )

            print(
                f"Average daily demand: "
                f"{result['averageDailyDemand']} units"
            )

            print(
                "\n========== FORECAST RESULTS =========="
            )

            print(
                f"Product: "
                f"{result['productName']}"
            )

            print(
                f"SKU: "
                f"{result['sku']}"
            )

            print(
                f"Category: "
                f"{result['category']}"
            )

            print(
                f"Model: "
                f"{result['model']}"
            )

            print(
                "\nNext 7 days:"
            )

            for forecast in result[
                "forecast"
            ]:

                print(
                    f"  {forecast['date']} "
                    f"→ "
                    f"{forecast['predictedDemand']} units"
                )

            print(
                "\n==============================================="
            )

            print(
                "✅ 7-DAY ML FORECAST GENERATED"
            )

            print(
                "===============================================\n"
            )

    except Exception as error:

        print(
            f"❌ Forecast generation failed: {error}",
            file=sys.stderr
        )

        sys.exit(1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()