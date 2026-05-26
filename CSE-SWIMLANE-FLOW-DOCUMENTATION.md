# 🏊 CSE Market Analyzer - Detailed Swimlane User Flow Documentation

## Overview

This document provides a comprehensive explanation of the user flow through the CSE Market Analyzer application, organized by swimlanes representing different layers of the system architecture.

---

## 🏊‍♂️ Swimlane Breakdown

### Lane 1: 👤 User (Actor)
**Purpose**: Represents the end user's journey through the application

### Lane 2: ⚛️ Frontend (React Application)
**Purpose**: User interface layer that handles all visual interactions

### Lane 3: 🔧 Backend API (FastAPI)
**Purpose**: Application server that processes requests and orchestrates business logic

### Lane 4: ⚙️ Services Layer
**Purpose**: Core business logic and specialized processing engines

### Lane 5: 🗄️ Database (MongoDB)
**Purpose**: Data persistence and retrieval

---

## 📋 Complete User Flow with Context

### **Phase 1: Initial Access & Authentication**

#### Step 1.1: User Visits Application
**User Action:**
- User navigates to the application URL (e.g., https://cse-analyzer.com)
- First-time visitor or returning user

**Frontend Response:**
- `B1: Render Landing Page`
- Displays welcome screen with overview of features
- Shows "Login" and "Register" buttons
- Checks localStorage for existing auth token

**Backend Processing:**
- `C1: Serve Static Assets`
- Delivers React application bundle
- Serves CSS, JavaScript, and static images
- Returns index.html with app shell

**Context:**
- This is the entry point for all users
- Application uses SPA (Single Page Application) architecture
- Static assets are cached for performance

---

#### Step 1.2: User Registers/Logs In
**User Action:**
- New user clicks "Register" and fills form:
  - Username (unique)
  - Email address
  - Password (minimum 6 characters)
  - Optional: Full name
- Returning user clicks "Login" and enters:
  - Username
  - Password

**Frontend Response:**
- `B2: Display Auth Forms`
- Renders registration or login form
- Validates input client-side (format, required fields)
- Shows loading state during submission
- Handles form submission via API call

**Backend Processing:**
- `C2: Authenticate User`
- Receives credentials from frontend
- Routes to appropriate service

**Service Layer:**
- `D1: Auth Service`
- **For Registration:**
  - Validates username/email uniqueness
  - Hashes password using bcrypt
  - Creates user record
  - Generates JWT token
- **For Login:**
  - Retrieves user from database
  - Verifies password hash
  - Generates JWT token with 30-minute expiry

**Database:**
- `E1: Users Collection`
- **Registration:** Inserts new user document
- **Login:** Queries user by username
- Returns user data to service

**Response Flow:**
- Database → Service → Backend → Frontend
- Frontend stores JWT token in localStorage
- Frontend updates auth state (Zustand store)
- User automatically redirected to Dashboard

**Context:**
- JWT token format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Token includes: user_id, username, expiration
- All subsequent requests include: `Authorization: Bearer <token>`

---

### **Phase 2: Dashboard & Data Overview**

#### Step 2.1: User Views Dashboard
**User Action:**
- After successful login, user lands on main dashboard
- Sees overview of their data and recent activity

**Frontend Response:**
- `B3: Load Dashboard UI`
- Renders dashboard components:
  - Summary statistics cards
  - Recent analysis history
  - Quick action buttons
  - Market overview charts
- Makes multiple API calls to populate data

**Backend Processing:**
- `C3: Fetch User Data`
- Validates JWT token
- Retrieves user-specific data
- Aggregates summary statistics

**Service Layer:**
- `D2: Data Service`
- Queries database for:
  - Total stocks uploaded
  - Latest market data
  - Recent predictions
  - User's analysis history

**Database:**
- `E2: Market Data`
- Queries for latest stock prices
- Aggregates data by date range
- Returns summary to service

**Context:**
- Dashboard shows personalized view
- Data is cached in React Query for 5 minutes
- Real-time updates via polling (every 60 seconds)
- Summary includes:
  - Number of stocks tracked
  - Date range of available data
  - Sectors covered
  - Recent prediction accuracy

---

### **Phase 3: Data Upload & Management**

#### Step 3.1: User Uploads Data
**User Action:**
- Clicks "Upload Data" from navigation
- Selects data type:
  - Stock market data (OHLCV)
  - Market indices (ASPI, S&P SL20)
  - Macroeconomic indicators
- Chooses CSV or Excel file from computer
- Reviews file preview
- Clicks "Upload" button

**Frontend Response:**
- `B4: File Upload Component`
- Renders drag-and-drop zone or file picker
- Validates file:
  - Format (CSV or XLSX only)
  - Size (max 50MB)
  - Basic structure
- Shows upload progress bar
- Displays preview of first 10 rows

**Backend Processing:**
- `C4: Process File Upload`
- Receives multipart/form-data request
- Validates file format and content
- Parses CSV/Excel using pandas
- Checks for required columns

**Service Layer:**
- `D2: Data Service`
- **For Stock Data:**
  - Required columns: symbol, date, open, high, low, close, volume
  - Optional columns: market_cap, pe_ratio, eps, dividend_yield
- **Data Validation:**
  - Date format parsing
  - Numeric field validation
  - Symbol format checking (e.g., COMB.N0000)
  - Duplicate detection
- **Processing:**
  - Row-by-row iteration
  - Error collection
  - Success/failure tracking

**Database:**
- `E2: Market Data` (for stocks)
- `E3: Index Data` (for indices)
- `E4: Macro Indicators` (for economic data)
- **Operation:** Upsert (update if exists, insert if new)
- **Index Key:** {symbol + date} for stocks
- Records include metadata:
  - uploaded_by: username
  - uploaded_at: timestamp

**Response:**
- Returns to user:
  ```json
  {
    "message": "Import completed",
    "records_imported": 245,
    "failed_records": 3,
    "errors": [
      "Row 15: Invalid date format",
      "Row 82: Missing close price",
      "Row 156: Symbol format invalid"
    ]
  }
  ```

**Context:**
- Upload is synchronous (waits for completion)
- For large files (>10,000 rows), consider background processing
- Errors don't stop import; partial success is allowed
- User can download error report for failed rows

---

### **Phase 4: Analysis Configuration & Execution**

#### Step 4.1: User Selects Analysis Type
**User Action:**
- Navigates to "Analysis" section
- Sees analysis options:
  - **Trend Analysis**: Technical indicators and patterns
  - **Correlation Analysis**: Stock/sector correlations
  - **Risk Analysis**: Risk metrics calculation
  - **Sector Comparison**: Performance across sectors
  - **Statistical Tests**: Normality, stationarity tests
- Clicks on desired analysis type

**Frontend Response:**
- `B5: Analysis Selection UI`
- Displays analysis type cards with descriptions
- Shows example outputs/previews
- Highlights recommended analysis for current data

---

#### Step 4.2: User Configures Parameters
**User Action:**
- Fills out analysis configuration form
- **Example for Trend Analysis:**
  - Select stocks: Dropdown with available symbols
  - Date range: Start and end date pickers
  - Indicators: Checkboxes for SMA, EMA, RSI, MACD
- **Example for Correlation Analysis:**
  - Select stocks or sectors: Multi-select dropdown
  - Correlation method: Radio buttons (Pearson, Spearman, Kendall)
  - Date range: Date pickers
- Reviews selections
- Clicks "Run Analysis" button

**Frontend Response:**
- `B6: Parameter Input Forms`
- Renders dynamic form based on analysis type
- Validates inputs:
  - At least one stock selected
  - Valid date range (start < end)
  - Dates within available data range
- Shows loading spinner on submit
- Disables form during processing

**Backend Processing:**
- `C5: Validate Requests`
- Receives analysis request with parameters
- Validates:
  - User has access to requested data
  - Stocks exist in database
  - Date range is valid
  - Parameters are within allowed limits
- Routes to appropriate analysis endpoint

**Backend Execution:**
- `C6: Execute Analysis`
- Calls appropriate service method
- Monitors execution time
- Handles errors gracefully

**Service Layer:**
- `D3: Analysis Service`
- Instantiates analysis engine
- Fetches required data from database

**Statistics Engine:**
- `D5: Statistics Engine`
- For **Trend Analysis:**
  - Calculates moving averages:
    - SMA (5, 10, 20, 50, 200 day)
    - EMA (12, 26 day)
  - Computes RSI (14 period)
  - Generates MACD (12, 26, 9)
  - Identifies Bollinger Bands
  - Detects support/resistance levels
  - Determines trend (bullish/bearish/sideways)
  - Generates trading signals

- For **Correlation Analysis:**
  - Retrieves price data for all symbols
  - Calculates returns (daily % change)
  - Computes correlation matrix
  - Generates heatmap data

- For **Risk Analysis:**
  - Volatility (annualized std dev)
  - Beta (vs market index)
  - Sharpe Ratio
  - Maximum Drawdown
  - Value at Risk (VaR 95%)
  - Conditional VaR (CVaR)

**Database:**
- `E2: Market Data`
- Queries optimized with indexes
- Example query:
  ```javascript
  {
    symbol: "COMB.N0000",
    date: { $gte: ISODate("2024-01-01"), $lte: ISODate("2024-12-31") }
  }
  ```
- Returns time-series data sorted by date

**Processing Time:**
- Simple analysis: 1-3 seconds
- Complex analysis: 5-10 seconds
- Very large datasets: 15-30 seconds

**Response Formatting:**
- `C7: Format Response`
- Structures data for frontend consumption
- Includes:
  - Analysis results
  - Metadata (execution time, data points used)
  - Warnings (insufficient data, outliers)
  - Recommendations

---

#### Step 4.3: User Views Results
**User Action:**
- Receives analysis results
- Interacts with visualizations:
  - Hover over charts for details
  - Zoom into specific time periods
  - Toggle indicators on/off
- Downloads results as PDF/CSV
- Shares analysis via link

**Frontend Response:**
- `B7: Charts & Visualizations`
- Renders using Recharts library
- **For Trend Analysis:**
  - Candlestick or line chart with price
  - Overlay technical indicators
  - Volume bars below
  - Signal annotations (buy/sell)
- **For Correlation:**
  - Correlation heatmap
  - Interactive matrix table
  - Clustered groupings
- **For Risk:**
  - Risk metrics dashboard
  - Comparison charts
  - Historical volatility plot

**Context:**
- Charts are interactive and responsive
- Data is cached for instant re-render
- User can save favorite analysis configurations
- Results are stored in browser history

---

### **Phase 5: Predictions & Machine Learning**

#### Step 5.1: User Generates Predictions
**User Action:**
- Navigates to "Predictions" section
- Selects stock symbol from dropdown
- Chooses model type:
  - **ML**: LSTM neural network
  - **Statistical**: ARIMA model
  - **Hybrid**: Ensemble (recommended)
- Sets forecast period (1-90 days)
- Enables/disables confidence intervals
- Clicks "Generate Forecast" button

**Frontend Response:**
- `B8: Prediction Interface`
- Displays prediction configuration form
- Shows estimated processing time
- Renders progress indicator during generation
- Explains model types with tooltips

**Backend Processing:**
- `C8: Run ML Models`
- Receives prediction request
- Validates stock has sufficient historical data (min 365 days)
- Routes to prediction service
- Can take 10-60 seconds depending on model

**Service Layer:**
- `D4: Prediction Service`
- Fetches historical data (last 730 days)
- Routes to appropriate model engine

**ML Engine:**
- `D6: ML Engine`
- **For LSTM Model:**
  - Prepares sequences (60-day lookback)
  - Normalizes data using MinMaxScaler
  - Builds neural network:
    ```
    Input(60 timesteps) 
    → LSTM(50 units) 
    → Dropout(0.2) 
    → LSTM(50 units) 
    → Dropout(0.2) 
    → Dense(25) 
    → Dense(1) 
    → Output
    ```
  - Trains on 80% data, validates on 20%
  - Generates predictions iteratively
  - Calculates confidence intervals

- **For ARIMA Model:**
  - Tests stationarity (ADF test)
  - Determines best order (p,d,q) = (5,1,0)
  - Fits model to historical data
  - Forecasts future values
  - Computes confidence intervals

- **For Random Forest:**
  - Engineers features:
    - Lag prices (1, 2, 3, 5, 10 days)
    - Moving averages
    - Technical indicators
    - Volume ratios
  - Trains ensemble of 100 trees
  - Ranks feature importance
  - Generates predictions

- **For Hybrid Ensemble:**
  - Runs all three models in parallel
  - Weighted average:
    - LSTM: 40%
    - ARIMA: 30%
    - Random Forest: 30%
  - Provides most accurate predictions

**Database Operations:**
- `E2: Market Data`
- Reads historical data for training
- No writes during prediction

- `E5: Predictions`
- Stores prediction results:
  ```json
  {
    "symbol": "COMB.N0000",
    "model_used": "Hybrid",
    "forecast_dates": ["2024-12-01", "2024-12-02", ...],
    "predicted_prices": [127.50, 128.20, ...],
    "accuracy_metrics": {
      "rmse": 2.45,
      "mae": 1.85,
      "mape": 1.52,
      "r2_score": 0.87
    },
    "created_at": "2024-11-15T10:30:00Z"
  }
  ```

**Response:**
- Returns prediction results with:
  - Forecast dates and prices
  - Upper and lower confidence bounds
  - Accuracy metrics
  - Feature importance (if RF used)
  - Model performance comparison

**Processing Time:**
- ARIMA: 5-10 seconds
- Random Forest: 10-20 seconds
- LSTM: 30-60 seconds
- Hybrid: 45-90 seconds (runs in parallel)

---

#### Step 5.2: User Reviews Insights
**User Action:**
- Views prediction results
- Examines forecast chart
- Reads AI-generated insights:
  - Trend direction
  - Price targets (30-day, 90-day)
  - Recommendation (Buy/Hold/Sell)
  - Risk level assessment
  - Key influencing factors
- Compares with historical accuracy

**Frontend Response:**
- `B9: Insights Dashboard`
- Renders comprehensive insights view:
  - **Forecast Chart:**
    - Historical prices (line)
    - Predicted prices (dashed line)
    - Confidence interval (shaded area)
    - Current price marker
  - **Insights Panel:**
    - Trend badge (🔺 Uptrend / 🔻 Downtrend / ➡️ Sideways)
    - Price predictions with % change
    - Recommendation chip (color-coded)
    - Risk meter (visual gauge)
  - **Factor Analysis:**
    - Top 5 influencing features
    - Importance scores
    - Explanations

**Backend Processing:**
- `C9: Calculate Insights`
- Analyzes prediction results
- Generates human-readable insights
- Applies business rules for recommendations

**Service Layer:**
- `D4: Prediction Service` (continued)
- **Insight Generation:**
  - Calculates trend strength
  - Determines recommendation:
    - Buy: predicted 90d price > current * 1.05
    - Sell: predicted 90d price < current * 0.95
    - Hold: otherwise
  - Assesses risk level:
    - Low: volatility < 2%
    - Medium: volatility 2-4%
    - High: volatility > 4%
  - Ranks feature importance
  - Computes confidence score

**Database:**
- `E5: Predictions`
- Retrieves historical predictions for comparison

- `E6: Analysis Results`
- Stores generated insights for future reference

**Context:**
- Insights are regenerated on each prediction
- User can compare multiple prediction runs
- Historical accuracy tracking helps build trust
- Recommendations are advisory only, not financial advice

---

### **Phase 6: Export & Sharing**

#### Step 6.1: User Exports/Shares Results
**User Action:**
- After viewing analysis or predictions
- Clicks "Export" or "Share" button
- Selects format:
  - **PDF Report**: Full analysis with charts
  - **CSV Data**: Raw data for Excel
  - **Share Link**: Shareable URL
  - **Email**: Send to recipients
- Configures export options
- Downloads or sends

**Frontend Response:**
- `B10: Export Functions`
- Displays export modal with options
- Validates selections
- Initiates export process
- Shows download link when ready

**Backend Processing:**
- `C10: Generate Reports`
- Receives export request
- Formats data based on export type
- Generates files server-side

**Export Types:**

1. **PDF Report:**
   - Executive summary
   - Charts and visualizations
   - Data tables
   - Methodology notes
   - Timestamp and user info

2. **CSV Data:**
   - Raw analysis results
   - Prediction values
   - Metadata columns

3. **Share Link:**
   - Generates unique URL
   - Sets expiration (7 days default)
   - Public or password-protected

4. **Email:**
   - Attaches PDF report
   - Includes summary in body
   - Sends via SMTP

**Context:**
- Exports are cached for 24 hours
- Share links are tracked for analytics
- Email requires email configuration
- Large exports may be processed asynchronously

---

## 🔄 Background Processes

### Automatic Data Refresh
- **Frequency**: Every 6 hours
- **Process**: 
  - Fetches latest data from configured sources
  - Updates market data collections
  - Triggers re-analysis for active watchlists
  - Sends notifications for significant changes

### Model Retraining
- **Frequency**: Weekly (Sunday nights)
- **Process**:
  - Retrains LSTM models with latest data
  - Updates feature importance
  - Validates accuracy against test set
  - Archives old model versions

### Data Archival
- **Frequency**: Monthly
- **Process**:
  - Moves data older than 5 years to cold storage
  - Compresses historical predictions
  - Maintains indices for fast retrieval

---

## 🚨 Error Handling & Edge Cases

### Authentication Failures
- **Expired Token**: Auto-redirect to login with session restoration
- **Invalid Credentials**: Show clear error message, allow retry
- **Account Locked**: Show unlock instructions

### Data Upload Errors
- **Invalid Format**: Suggest correct format, show example
- **Missing Columns**: Highlight required columns
- **Duplicate Data**: Option to skip or overwrite

### Analysis Failures
- **Insufficient Data**: Show minimum requirements
- **Server Timeout**: Offer to run in background
- **Invalid Parameters**: Highlight errors, suggest corrections

### Prediction Errors
- **Model Training Failed**: Fallback to simpler model
- **No Historical Data**: Suggest data upload
- **Computation Timeout**: Queue for background processing

---

## 📊 Performance Benchmarks

| Operation | Expected Time | Optimization |
|-----------|---------------|--------------|
| Login | < 500ms | JWT validation cached |
| Dashboard Load | < 2s | Aggregated queries, caching |
| File Upload (1000 rows) | < 5s | Batch inserts, upserts |
| Trend Analysis | < 3s | Indexed queries, numpy vectorization |
| Correlation Matrix (10 stocks) | < 5s | Parallel computation |
| LSTM Prediction | 30-60s | GPU acceleration if available |
| ARIMA Prediction | 5-10s | Optimized statsmodels |

---

## 🔐 Security Considerations at Each Step

### Authentication
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens signed with HS256
- Tokens expire after 30 minutes
- Refresh token rotation implemented

### Data Upload
- File type validation (whitelist)
- File size limits enforced
- Virus scanning on upload
- User quota limits

### API Access
- Rate limiting: 100 requests/minute per user
- Input sanitization on all endpoints
- SQL injection prevention (NoSQL + validation)
- CORS restricted to allowed origins

### Data Access
- User can only access their own data
- Admin role for system-wide access
- Audit logs for sensitive operations

---

## 📈 Scalability Considerations

### Horizontal Scaling
- Backend: Multiple API containers behind load balancer
- Database: MongoDB replica set with sharding
- Queue: Redis/Celery for background jobs

### Caching Strategy
- Frontend: React Query (5-minute cache)
- Backend: Redis for frequently accessed data
- Database: Query result caching

### Database Optimization
- Compound indexes on {symbol, date}
- Time-series collections for high-frequency data
- Aggregation pipelines for complex queries

---

## 🎯 User Success Metrics

### Key Performance Indicators
- **Time to First Insight**: < 5 minutes (from registration)
- **Prediction Accuracy**: MAPE < 5% for 30-day forecasts
- **User Satisfaction**: NPS > 70
- **System Uptime**: 99.9%
- **API Response Time**: p95 < 2 seconds

---

This detailed documentation should help developers, stakeholders, and users understand exactly how data flows through the CSE Market Analyzer system, what happens at each step, and how different components interact!
