# YIMS Backend (REST API & Manufacturing Engine)

The backend service for the **Yashvee Inventory Management System (YIMS)** is built with Node.js, Express.js, MongoDB, and Mongoose. It provides the central manufacturing engine, enforcing database-backed inventory integrity, automated Bill of Materials (BOM) capacity calculations, multi-warehouse stock allocations, immutable aluminium audit ledgers, and atomic warehouse transfers.

---

## 🏗️ Architecture & Core Design Principles

```
                              ┌───────────────────────────┐
                              │     Express.js API        │
                              │  (JWT Auth & Validation)  │
                              └─────────────┬─────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
  ┌────────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐
  │  Aluminium Lifecycle   │   │  BOM Bottleneck Engine │   │   Inventory & Orders   │
  │  - gm/kg conversions   │   │  - Min capacity formula│   │  - Multi-item transfers│
  │  - Strict W1 deposits  │   │  - Limiting material   │   │  - Dynamic sales qty   │
  │  - Immutable ledger    │   │  - Availability matrix │   │  - Multi-warehouse stk │
  └────────────┬───────────┘   └────────────┬───────────┘   └────────────┬───────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │       MongoDB Database    │
                              │   (mongodb://.../yims_db) │
                              └───────────────────────────┘
```

### Key Business Logic & Rules
1. **Dedicated Aluminium Lifecycle**:
   - Aluminium base unit is grams (`gm`), with automatic conversion from kilograms (`kg`) ($1\text{ kg} = 1000\text{ gm}$).
   - Formula: $\text{Available} = \text{Opening} + \text{Completed Purchases} - \text{Production Consumption} - \text{Scrap/Wastage}$.
   - Every movement is immutably logged in the `AluminiumLedger`.
2. **Strict Warehouse 1 Manufacturing Rule**:
   - Raw materials produced from aluminium die-casting are **strictly deposited into Warehouse 1 (Main Factory Hub)**. This rule is enforced by the service layer.
   - Materials can subsequently be transferred to Warehouse 2 (Sub-Assembly) or Warehouse 3 (Finished Goods Logistics) via atomic **Warehouse Transfers**.
3. **Bill of Materials (BOM) Bottleneck Capacity Engine**:
   - Calculates real-time manufacturing capacity:
     $$\text{Capacity} = \min_{m \in \text{BOM}} \left( \left\lfloor \frac{\text{Available Stock}_m}{\text{Required Qty}_m} \right\rfloor \right)$$
   - Strips database ObjectIds from capacity outputs to prevent exposing raw MongoDB IDs.
4. **Dynamic Transaction-Backed Inventories**:
   - Product sales quantities are dynamically aggregated from completed `SALE` orders.
   - Raw material stock: $\text{Stock} = \text{Starting} + \text{Purchases In} - \text{Usage/Sales Out} + \text{Transfers In} - \text{Transfers Out} + \text{Production In}$.
5. **Multi-Item Atomic Transfers**:
   - Supports transferring multiple raw materials and products in a single operation between warehouses with pre-execution deficit validation.

---

## 📁 Directory Structure

```
backend/
├── .env.example                # Template for environment configuration
├── .env                        # Local environment variables
├── package.json                # Dependencies and npm scripts
├── src/
│   ├── server.js               # Main Express entry point & static frontend fallback
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose connection setup
│   ├── controllers/            # Route request handlers
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── productController.js
│   │   ├── rawMaterialController.js
│   │   ├── bomController.js
│   │   ├── warehouseController.js
│   │   ├── orderController.js
│   │   ├── aluminiumController.js
│   │   ├── transferController.js
│   │   ├── reportController.js
│   │   └── settingsController.js
│   ├── middleware/             # Express middlewares
│   │   ├── authMiddleware.js   # JWT authentication & role-based access
│   │   └── validateMiddleware.js # express-validator validation wrapper
│   ├── models/                 # Mongoose schema models
│   │   ├── User.js             # User accounts & roles (Admin, Staff, Viewer)
│   │   ├── Warehouse.js        # Multi-facility metadata (W1, W2, W3)
│   │   ├── Product.js          # Finished LED fixtures & specs
│   │   ├── RawMaterial.js      # Components, aluminium usage, and reorder points
│   │   ├── BOM.js              # Product component recipes & quantities
│   │   ├── WarehouseInventory.js # Warehouse-specific stock balances & reservations
│   │   ├── Order.js            # Purchase & Sale Orders (with mixed-item support)
│   │   ├── AluminiumInventory.js # Central aluminium balances (kg/gm)
│   │   ├── AluminiumPurchase.js  # Aluminium supply transactions
│   │   ├── AluminiumProduction.js# Die-casting runs & scrap generation
│   │   ├── AluminiumLedger.js  # Immutable transaction audit trail
│   │   ├── WarehouseTransfer.js# Multi-item warehouse stock transfers
│   │   └── Settings.js         # Enterprise configuration & thresholds
│   ├── routes/                 # REST API routes
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── productRoutes.js
│   │   ├── rawMaterialRoutes.js
│   │   ├── bomRoutes.js
│   │   ├── warehouseRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── aluminiumRoutes.js
│   │   ├── transferRoutes.js
│   │   ├── reportRoutes.js
│   │   └── settingsRoutes.js
│   ├── services/               # Core business calculation logic
│   │   ├── aluminiumService.js
│   │   ├── bomCalculationService.js
│   │   ├── inventoryService.js
│   │   ├── orderService.js
│   │   └── transferService.js
│   └── seed/                   # Database seeder
│       ├── seed.js             # Seed execution script
│       └── seedData.js         # Initial factory data (Excel-derived)
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | HTTP port on which the Express server listens |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/yims_db` | MongoDB connection string |
| `JWT_SECRET` | `yims_super_secure_jwt_manufacturing_secret_key_2024` | Secret key used for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Lifespan of generated JWT tokens |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher running locally on port `27017`

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Seed Factory Database
Populate the database with initial LED products, raw materials, warehouses (W1, W2, W3), BOM formulas, aluminium balance, and default admin credentials:
```bash
npm run seed
```

**Default Admin Credentials**:
- **Email**: `admin@yims.com`
- **Password**: `admin123`

### 3. Run the Server

#### Development Mode (with Node file watcher):
```bash
npm run dev
# Server will start on http://localhost:5000 with auto-reload on file changes
```

#### Production Mode:
```bash
npm start
```

---

## 📡 REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/auth/login`.

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate user and receive JWT token.
- `GET /api/auth/me`: Get current authenticated user profile.
- `POST /api/auth/register`: Register a new user (Admin only).
- `PUT /api/auth/profile`: Update user profile details.
- `PUT /api/auth/password`: Change password.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard`: Aggregated metrics (KPI cards, order charts, warehouse distribution, aluminium trend, bottleneck alerts).

### Products (`/api/products`)
- `GET /api/products`: List all finished products with live dynamic sales quantity and stock totals.
- `GET /api/products/:id`: Get product details including warehouse stock breakdown and BOM.
- `POST /api/products`: Create a new product.
- `PUT /api/products/:id`: Update product details.
- `DELETE /api/products/:id`: Delete a product.

### Raw Materials (`/api/raw-materials`)
- `GET /api/raw-materials`: List all raw materials with live formula balances and reorder indicators.
- `GET /api/raw-materials/:id`: Get raw material details, usage in BOMs, and warehouse stocks.
- `POST /api/raw-materials`: Create a new raw material.
- `PUT /api/raw-materials/:id`: Update raw material details.
- `DELETE /api/raw-materials/:id`: Delete a raw material.

### Bill of Materials (`/api/bom`)
- `GET /api/bom`: List all BOM recipes.
- `GET /api/bom/product/:productId`: Get BOM recipe for a specific product.
- `POST /api/bom`: Create or update a BOM recipe.
- `DELETE /api/bom/:id`: Delete a BOM recipe.
- `GET /api/bom/bottlenecks`: Today's Availability Matrix and manufacturing capacity for all products.

### Aluminium Lifecycle (`/api/aluminium`)
- `GET /api/aluminium/inventory`: Current aluminium balance in kg and gm.
- `POST /api/aluminium/purchases`: Log a new aluminium purchase.
- `GET /api/aluminium/purchases`: List aluminium purchase history.
- `POST /api/aluminium/productions`: Log an aluminium die-casting run (strictly deposits output to Warehouse 1).
- `GET /api/aluminium/productions`: List aluminium production runs with pagination.
- `GET /api/aluminium/ledger`: Immutable audit ledger of all aluminium movements.

### Orders (`/api/orders`)
- `GET /api/orders`: List orders with pagination and filters (`orderType`, `status`).
- `GET /api/orders/:id`: Get single order details with itemized rows.
- `POST /api/orders`: Create a new Purchase or Sale order (supports mixed Products & Raw Materials).
- `POST /api/orders/:id/approve`: Approve order and reserve inventory.
- `POST /api/orders/:id/complete`: Complete order, fulfill stock, and update financial totals.
- `POST /api/orders/:id/cancel`: Cancel order and release reserved stock.

### Warehouses & Inventory (`/api/warehouses`)
- `GET /api/warehouses`: List all active warehouses (W1 Main, W2 Sub-Assembly, W3 Finished Goods).
- `GET /api/warehouses/:id/inventory`: Get warehouse-specific stock levels for all items.

### Warehouse Transfers (`/api/transfers`)
- `GET /api/transfers`: List stock transfers with pagination.
- `POST /api/transfers`: Initiate a multi-item stock transfer between warehouses with validation.
- `POST /api/transfers/:id/execute`: Execute a pending transfer and atomically shift stock.
- `POST /api/transfers/:id/cancel`: Cancel a pending transfer.

### Reports & Audits (`/api/reports`)
- `GET /api/reports/sales`: Sales performance report.
- `GET /api/reports/purchases`: Purchases report.
- `GET /api/reports/stock-balance`: Consolidated multi-warehouse stock balance report.
- `GET /api/reports/low-stock`: Critical reorder alert report.
- `GET /api/reports/capacity`: Today's manufacturing capacity & bottleneck report (with MongoDB IDs stripped).
- `GET /api/reports/transfers`: Warehouse transfers audit report.
- `GET /api/reports/aluminium-ledger`: Aluminium consumption and balance audit report.

### System Settings (`/api/settings`)
- `GET /api/settings`: Get global system settings.
- `PUT /api/settings`: Update system settings (Admin only).

---

## 🔒 Security & Data Integrity

- **Password Security**: Passwords hashed using `bcryptjs` with salt rounds of 10.
- **Stateless Authorization**: JWT token verification with configurable expiration.
- **Input Validation**: Strict validation and sanitization using `express-validator`.
- **Database Consistency**: Atomic operations for stock transfers and status transitions prevent negative inventory and race conditions.
- **CORS Configuration**: Configured to accept incoming requests from the frontend development server.
