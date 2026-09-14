const express = require("express");
const { getAuth } = require("@clerk/express");
const { spawn } = require("child_process");

const requireRole = require("../middleware/requireRole");

const router = express.Router();


// ============================================================
// ML FORECAST CONFIGURATION
// ============================================================

const PYTHON_COMMAND = "python3";


// ============================================================
// RUN PYTHON FORECAST
// ============================================================

function runPythonForecast(sku) {
  return new Promise(
    (resolve, reject) => {

      const pythonProcess = spawn(
        PYTHON_COMMAND,
        [
          "forecasting/predict.py",
          sku,
          "--json",
        ],
        {
          cwd: process.cwd(),
        }
      );

      let stdout = "";
      let stderr = "";

      // ------------------------------------------------------
      // Collect standard output
      // ------------------------------------------------------

      pythonProcess.stdout.on(
        "data",
        (data) => {

          const output = data.toString();

          stdout += output;

        }
      );

      // ------------------------------------------------------
      // Collect errors
      // ------------------------------------------------------

      pythonProcess.stderr.on(
        "data",
        (data) => {

          const output = data.toString();

          stderr += output;

          // Also show Python errors in Node terminal
          process.stderr.write(
            `[Python] ${output}`
          );
        }
      );

      // ------------------------------------------------------
      // Process completed
      // ------------------------------------------------------

      pythonProcess.on(
        "close",
        (code) => {

          if (code !== 0) {

            console.error(
              "Python forecast process failed."
            );

            console.error(
              stderr
            );

            return reject(
              new Error(
                stderr.trim()
                || "Python forecast failed"
              )
            );
          }

          try {

            const result = JSON.parse(
              stdout.trim()
            );

            // ------------------------------------------------
            // Show successful ML result in Node terminal
            // ------------------------------------------------

            console.log(
              "\n========== ML FORECAST RESULT =========="
            );

            console.log(
              `Product: ${result.productName}`
            );

            console.log(
              `SKU: ${result.sku}`
            );

            console.log(
              `Model: ${result.model}`
            );

            console.log(
              `Historical days: ${result.historicalDaysUsed}`
            );

            console.log(
              `Average daily demand: ${result.averageDailyDemand} units`
            );

            console.log(
              `Total historical demand: ${result.totalHistoricalDemand} units`
            );

            console.log(
              "\nNext 7 days:"
            );

            result.forecast.forEach(
              (forecast) => {

                console.log(
                  `  ${forecast.date} → ${forecast.predictedDemand} units`
                );

              }
            );

            console.log(
              "========================================\n"
            );

            resolve(result);

          } catch (error) {

            console.error(
              "Invalid Python forecast output:"
            );

            console.error(
              stdout
            );

            reject(
              new Error(
                "Failed to parse ML forecast output"
              )
            );
          }
        }
      );

      // ------------------------------------------------------
      // Process error
      // ------------------------------------------------------

      pythonProcess.on(
        "error",
        (error) => {

          reject(error);

        }
      );
    }
  );
}


// ============================================================
// GET ML DEMAND FORECAST
// ============================================================

router.get(
  "/:sku",
  requireRole("org:retailer"),
  async (req, res) => {

    try {

      const auth = getAuth(req);

      if (!auth.orgId) {

        return res.status(400).json({
          message: "Organization not found",
        });

      }

      const normalizedSku =
        req.params.sku.toUpperCase();

      console.log(
        `Generating ML forecast for ${normalizedSku}...`
      );

      const forecast =
        await runPythonForecast(
          normalizedSku
        );

      return res.status(200).json({
        message:
          "ML demand forecast generated successfully",

        ...forecast,
      });

    } catch (error) {

      console.error(
        "Demand forecast error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to generate ML demand forecast",
      });

    }

  }
);


module.exports = router;