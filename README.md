# SupplySync

SupplySync is a full-stack supply chain and inventory management web application designed to help retailers, suppliers, and administrators manage stock, purchase orders, payments, and demand forecasting in one platform.

The system combines:
- a React + Vite frontend for dashboards and workflows
- an Express + MongoDB backend for APIs and business logic
- Clerk authentication and role-based access control
- Razorpay integration for payments and payouts
- Python-based demand forecasting for SKU planning and supplier recommendations

## Project Overview

SupplySync helps organizations manage the full flow of goods and transactions:
- monitor inventory and stock levels
- track sales and expiry data
- generate demand forecasts for products
- identify suppliers based on demand and stock requirements
- create and track purchase orders
- manage retailer and supplier payment flows
- provide separate dashboards for different user roles

## Key Features

### Retailer Features
- inventory tracking
- sales and expiry monitoring
- purchase order creation
- supplier recommendations based on forecast demand
- bill and payment processing
- demand forecasting for product SKUs

### Supplier Features
- supplier profile management
- product availability updates
- dashboard for incoming purchase orders and payouts
- performance and transaction visibility

### Admin Features
- transaction and payment monitoring
- organization-level oversight
- bulk operational management and reporting

### AI / Forecasting
- Python forecasting module using historical sales features
- prediction of future demand by SKU
- recommendation engine to select suitable suppliers

## Tech Stack

### Frontend
- React 19
- Vite
- React Router DOM
- Tailwind CSS
- Clerk React SDK
- Lucide React icons

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Clerk Express SDK
- Razorpay SDK
- JWT / bcrypt support for auth-related workflows
- CORS and dotenv

### Forecasting / ML
- Python
- pandas
- numpy
- scikit-learn
- pymongo
- python-dotenv

## Project Structure

```text
SupplySync/
├── backend/
│   ├── forecasting/
│   │   ├── predict.py
│   │   ├── train_model.py
│   │   └── models/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── .env.example (if added locally)
│   ├── package.json
│   ├── server.js
│   └── package-lock.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── package-lock.json
├── .venv/
├── .gitignore
└── README.md
```

## Prerequisites

Before running the project, make sure you have:
- Node.js (recommended: v18+ or v20+)
- npm
- Python 3.9+ or 3.10+
- MongoDB running locally or a MongoDB Atlas connection
- Clerk account and API keys
- Razorpay account and API keys

## Clone the Repository

```bash
git clone https://github.com/harshith1440/SupplySync.git
cd SupplySync
```

If your repository is in a local folder, you can also open the folder directly in VS Code and work from there.

## Install Dependencieshttps:

### 1) Backend dependencies

```bash
cd backend
npm install
```

Backend dependencies used in this project include:
- @clerk/express
- bcryptjs
- cors
- dotenv
- express
- jsonwebtoken
- mongodb
- mongoose
- razorpay
- nodemon (dev dependency)

### 2) Frontend dependencies

```bash
cd frontend
npm install
```

Frontend dependencies used in this project include:
- @clerk/react
- lucide-react
- react
- react-dom
- react-router-dom

Frontend dev dependencies include:
- @tailwindcss/vite
- @types/react
- @types/react-dom
- @vitejs/plugin-react
- autoprefixer
- oxlint
- postcss
- tailwindcss
- typescript
- vite

### 3) Python dependencies for forecasting

The forecasting module uses Python packages such as:
- numpy
- pandas
- pymongo
- python-dotenv
- scikit-learn

You can install them using:

```bash
pip install numpy pandas pymongo python-dotenv scikit-learn
```

If you are using the project virtual environment already available in the workspace, it may already be activated in your terminal.

## Environment Variables

Create a `.env` file inside the `backend` folder and add the required keys:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/supplysync
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_ORGANIZATION_ID=your_clerk_org_id
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

The frontend may also need Clerk public configuration depending on your application setup and environment setup in the app code.
```env
VITE_CLERK_PUBLISHABLE_KEY = your_clerk_publishable_key
```
## Run the Project

### Start the backend

```bash
cd backend
node server.js
```

Or with nodemon for development:

```bash
cd backend
npx nodemon server.js
```

### Start the frontend

```bash
cd frontend
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## How the App Works

1. Users sign in through Clerk-based authentication.
2. Users are assigned roles such as retailer, supplier, or admin.
3. Retailers manage inventory, sales, and orders.
4. Purchase orders and bills are processed through APIs.
5. Forecasting runs through the Python engine and predicts product demand.
6. Supplier recommendations are generated using inventory and pricing data.
7. Razorpay handles payment and payout workflows.

## Notes

- This project is built for a demo / business workflow environment and depends on MongoDB and external auth/payment services.
- The forecasting scripts and supplier recommendation logic are connected to the backend APIs.
- Make sure your environment variables and database connection are configured before starting the app.

## Contributing

You can fork the project, create a feature branch, and open a pull request with your changes.

```bash
git checkout -b feature/your-feature-name
```

## Future Improvements

Possible additions for this project include:
- better analytics dashboards
- notification systems
- role-based permissions refinement
- stronger forecasting model evaluation
- order automation and alerting
- deployment configuration for Docker / Render / Vercel / AWS

---

