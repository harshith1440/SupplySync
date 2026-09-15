import os
import sys
import pickle
import json
import random
from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv(
    dotenv_path=os.path.join(
        os.path.dirname(__file__),
        "..",
        ".env"
    )
)


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
MINIMUM_HISTORY_RECORDS = 60
SYNTHETIC_SOURCE = "forecast_cold_start"


class InsufficientHistoryError(Exception):
    """Raised when the trained feature pipeline lacks enough history."""

    def __init__(self, sku, found, required):
        self.sku = sku
        self.found = found
        self.required = required
        super().__init__(
            f"Not enough historical feature data for SKU {sku}. "
            f"Found {found} records. Need at least {required}."
        )


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
    sku,
    organization_id=None
):
    """
    Load the latest historical forecast
    feature records for a SKU.
    """

    collection = database["forecastfeatures"]

    query = {"sku": sku}

    if organization_id:
        query["organizationId"] = organization_id

    documents = list(
        collection.find(query)
        .sort(
            "saleDate",
            -1
        )
        .limit(HISTORY_DAYS)
    )

    if len(documents) < HISTORY_DAYS:

        raise InsufficientHistoryError(
            sku,
            len(documents),
            HISTORY_DAYS
        )

    # Convert to chronological order
    documents.reverse()

    return documents


def load_real_sales(database, sku, organization_id):
    """Load only retailer-recorded sales for a SKU and organization."""

    return list(
        database["sales"].find(
            {
                "sku": sku,
                "organizationId": organization_id,
                "isSynthetic": {"$ne": True},
            }
        ).sort("saleDate", 1)
    )


def synthetic_quantity(rng, product_name, category, sale_date):
    """Create deterministic, bounded historical demand for cold start only."""

    text = f"{product_name} {category}".lower()
    if any(word in text for word in ["milk", "bread", "water"]):
        base_demand = 7
    elif any(word in text for word in ["oil", "rice", "atta", "flour"]):
        base_demand = 4
    elif any(word in text for word in ["soap", "shampoo", "detergent"]):
        base_demand = 2
    else:
        base_demand = 3

    weekend_multiplier = 1.15 if sale_date.weekday() >= 5 else 1
    noise = rng.uniform(0.8, 1.2)
    return max(0, round(base_demand * weekend_multiplier * noise))


def build_cold_start_history(database, sku, organization_id):
    """Persist marked historical samples while preserving all real sales."""

    inventory = database["inventories"].find_one(
        {"sku": sku, "organizationId": organization_id}
    )
    if not inventory:
        raise ValueError(
            f"Inventory not found for SKU {sku} in organization {organization_id}"
        )

    real_sales = load_real_sales(database, sku, organization_id)
    real_sales_by_day = {}
    for sale in real_sales:
        sale_day = pd.to_datetime(sale["saleDate"]).date()
        current = real_sales_by_day.setdefault(
            sale_day,
            {
                "quantitySold": 0,
                "sellingPrice": sale.get("sellingPrice", 0),
                "discount": sale.get("discount", 0),
                "promotion": sale.get("promotion", False),
                "festival": sale.get("festival"),
                "inventoryId": sale.get("inventoryId") or inventory["_id"],
            },
        )
        current["quantitySold"] += float(sale.get("quantitySold", 0))

    real_day_count = len(real_sales_by_day)
    synthetic_count = max(0, MINIMUM_HISTORY_RECORDS - real_day_count)
    earliest_real_day = min(real_sales_by_day) if real_sales_by_day else None
    end_day = earliest_real_day - timedelta(days=1) if earliest_real_day else date.today()
    start_day = end_day - timedelta(days=synthetic_count - 1)
    rng = random.Random(f"{organization_id}:{sku}")

    database["sales"].delete_many(
        {
            "sku": sku,
            "organizationId": organization_id,
            "isSynthetic": True,
            "syntheticSource": SYNTHETIC_SOURCE,
        }
    )

    synthetic_sales = []
    for offset in range(synthetic_count):
        sale_day = start_day + timedelta(days=offset)
        synthetic_sales.append(
            {
                "organizationId": organization_id,
                "retailerUserId": inventory.get("retailerUserId"),
                "inventoryId": inventory["_id"],
                "productName": inventory["productName"],
                "sku": sku,
                "category": inventory.get("category", "groceries"),
                "quantitySold": synthetic_quantity(
                    rng,
                    inventory.get("productName", sku),
                    inventory.get("category", "groceries"),
                    sale_day,
                ),
                "sellingPrice": inventory.get("sellingPrice") or inventory.get("price") or inventory.get("purchasePrice") or 0,
                "discount": 0,
                "promotion": False,
                "festival": None,
                "saleDate": datetime.combine(sale_day, datetime.min.time()),
                "isSynthetic": True,
                "syntheticSource": SYNTHETIC_SOURCE,
            }
        )

    if synthetic_sales:
        database["sales"].insert_many(synthetic_sales)

    history = []
    for item in synthetic_sales:
        history.append(item)
    for sale_day in sorted(real_sales_by_day):
        details = real_sales_by_day[sale_day]
        history.append(
            {
                "organizationId": organization_id,
                "inventoryId": details["inventoryId"],
                "productName": inventory["productName"],
                "sku": sku,
                "category": inventory.get("category", "groceries"),
                "quantitySold": details["quantitySold"],
                "sellingPrice": details["sellingPrice"],
                "discount": details["discount"],
                "promotion": details["promotion"],
                "festival": details["festival"],
                "saleDate": datetime.combine(sale_day, datetime.min.time()),
                "isSynthetic": False,
                "syntheticSource": None,
            }
        )

    features = []
    demand_history = [float(item["quantitySold"]) for item in history]
    for current_index in range(30, len(history)):
        item = history[current_index]
        sale_day = pd.to_datetime(item["saleDate"]).date()
        previous7 = demand_history[max(0, current_index - 7):current_index]
        previous14 = demand_history[max(0, current_index - 14):current_index]
        previous30 = demand_history[max(0, current_index - 30):current_index]
        features.append(
            {
                "organizationId": organization_id,
                "inventoryId": item["inventoryId"],
                "productName": item["productName"],
                "sku": sku,
                "category": item["category"],
                "saleDate": datetime.combine(sale_day, datetime.min.time()),
                "quantitySold": item["quantitySold"],
                "sellingPrice": item["sellingPrice"],
                "discount": item["discount"],
                "promotion": item["promotion"],
                "festival": item["festival"],
                "dayOfWeek": sale_day.weekday(),
                "dayOfMonth": sale_day.day,
                "month": sale_day.month,
                "weekOfYear": int(sale_day.isocalendar().week),
                "isWeekend": sale_day.weekday() >= 5,
                "lag1": demand_history[current_index - 1],
                "lag7": demand_history[current_index - 7],
                "lag14": demand_history[current_index - 14],
                "lag30": demand_history[current_index - 30],
                "rolling7Average": float(np.mean(previous7)),
                "rolling14Average": float(np.mean(previous14)),
                "rolling30Average": float(np.mean(previous30)),
                "rolling7StdDev": float(np.std(previous7)),
                "isSynthetic": item["isSynthetic"],
                "syntheticSource": item["syntheticSource"],
                "sourceRealSalesCount": len(real_sales),
            }
        )

    database["forecastfeatures"].delete_many(
        {"sku": sku, "organizationId": organization_id}
    )
    if features:
        database["forecastfeatures"].insert_many(features)

    return len(features), len(synthetic_sales), len(real_sales)


def needs_cold_start(database, sku, organization_id):
    """Decide whether marked fallback history must be built or refreshed."""

    feature_query = {"sku": sku, "organizationId": organization_id}
    feature_count = database["forecastfeatures"].count_documents(feature_query)
    if feature_count >= HISTORY_DAYS:
        synthetic_feature = database["forecastfeatures"].find_one(
            {**feature_query, "isSynthetic": True},
            {"sourceRealSalesCount": 1},
        )
        if not synthetic_feature:
            return False
        real_count = len(load_real_sales(database, sku, organization_id))
        return real_count != (synthetic_feature.get("sourceRealSalesCount") or 0)
    return True


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
    feature_columns,
    organization_id=None
):
    """
    Generate recursive 7-day demand forecast.
    """

    historical_features = load_latest_features(
        database,
        sku,
        organization_id
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

    organization_id = None
    if "--organization-id" in sys.argv:
        organization_index = sys.argv.index("--organization-id") + 1
        if organization_index >= len(sys.argv):
            raise ValueError("Organization ID is required after --organization-id")
        organization_id = sys.argv[organization_index]

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

            history_source = "existing_forecast_features"
            synthetic_history_count = 0

            if organization_id and needs_cold_start(
                database,
                sku,
                organization_id
            ):
                (
                    generated_feature_count,
                    synthetic_history_count,
                    real_sales_count,
                ) = build_cold_start_history(
                    database,
                    sku,
                    organization_id
                )

                if generated_feature_count < HISTORY_DAYS:
                    raise InsufficientHistoryError(
                        sku,
                        generated_feature_count,
                        HISTORY_DAYS
                    )

                history_source = (
                    "real_and_synthetic_history"
                    if real_sales_count
                    else "synthetic_history"
                )

            # ------------------------------------------------
            # Generate forecast
            # ------------------------------------------------

            result = generate_forecast(
                database,
                sku,
                model,
                feature_columns,
                organization_id
            )

            result["historicalDataSource"] = history_source
            result["syntheticHistoricalRecords"] = synthetic_history_count

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

    except InsufficientHistoryError as error:

        if json_mode:
            print(
                json.dumps({
                    "status": "insufficient_data",
                    "sku": error.sku,
                    "historicalDaysUsed": error.found,
                    "requiredHistoricalDays": error.required,
                    "message": "More sales history is required to generate an ML forecast.",
                })
            )
            return

        print(
            f"❌ {error}",
            file=sys.stderr
        )
        sys.exit(1)

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