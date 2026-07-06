# UC COOP Loan Monitoring and Financial Management System (Phase 1 Backend)

This is the backend API and financial computation engine for the UC COOP Loan Monitoring and Financial Management System. It is built using Node.js (Express), PostgreSQL, and implements role-based access control, transaction ledger auditing, interest schedule calculators, and Excel report generation.

---

## 🛠️ Technology Stack
* **Runtime:** Node.js (v20+) with ES Modules (`"type": "module"`)
* **Framework:** Express.js
* **Database:** PostgreSQL (Pg Pool connection)
* **Key Dependencies:**
  * `bcryptjs` (Password hashing)
  * `jsonwebtoken` (State-less session security)
  * `exceljs` (Analytical spreadsheet compiler)
  * `helmet` (Security headers protection)
  * `express-rate-limit` (Denial of Service prevention)

---

## 📁 Repository Structure
```text
├── config/
│   └── db.js                 # PostgreSQL client connection pool
├── controllers/
│   ├── authController.js     # User registration, login, and sessions
│   ├── memberController.js   # CRUD & audited profile status updates
│   ├── accountController.js  # Share Capital, Fixed Deposit, & Investment ledgers
│   ├── loanController.js     # Loan products, applications, and repayments
│   ├── billingController.js  # Billing run queues and delinquency aging
│   └── reportController.js   # Analytical query engines for Excel reports
├── db/
│   ├── schema.sql            # Core database schema (13 tables, indices)
│   └── seeds.sql             # Setup seeds (Roles, Admin accounts, Products)
├── middleware/
│   ├── authMiddleware.js     # JWT extraction & Role-based restriction guards
│   └── errorMiddleware.js    # Global centralized error handler
├── routes/
│   ├── authRoutes.js         # /api/auth/* endpoints
│   ├── memberRoutes.js       # /api/members/* endpoints
│   ├── accountRoutes.js      # /api/accounts/* endpoints
│   ├── loanRoutes.js         # /api/loans/* endpoints
│   ├── billingRoutes.js      # /api/billing/* endpoints
│   └── reportRoutes.js       # /api/reports/* endpoints
├── services/
│   ├── calculationCore.js    # Financial math for Flat-Rate & Diminishing Balance
│   └── reportExporter.js     # Binary OpenXML Excel sheet compiler
├── .env.example              # Template config
├── .gitignore                # Protected environments/nodes exclusions
├── app.js                    # Express app configurations & router mounts
└── server.js                 # Server entry point listener
```

---

## 🚀 Getting Started

### 1. Database Setup
1. Open your PostgreSQL console in Fedora/Linux:
   ```bash
   sudo -u postgres psql
   ```
2. Create the target database:
   ```sql
   CREATE DATABASE uc_coop_loans;
   ```
3. Exit `psql` and import the schema and seeds:
   ```bash
   cat db/schema.sql | sudo -u postgres psql -d uc_coop_loans
   cat db/seeds.sql | sudo -u postgres psql -d uc_coop_loans
   ```

### 2. Environment Configurations
1. Copy the template file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your connection details:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=uc_coop_loans
   JWT_SECRET=choose_a_long_random_string_here
   JWT_EXPIRES_IN=7d
   ```

### 3. Server Installation & Execution
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs with hot reloading via `nodemon`):
   ```bash
   npm run dev
   ```
3. The API will be online at: `http://localhost:5000`

---

## 🔑 Default Seed Users for Testing
* **Coop Admin:**
  * Username: `admin`
  * Password: `password123`
* **Coop Manager:**
  * Username: `manager`
  * Password: `password123`
* **Coop Member:**
  * Username: `member`
  * Password: `password123`

---

## 📖 Endpoint Documentation
For a full guide on available endpoints (request body payloads, URL parameters, roles required, and query filters), see the **[API Walkthrough Guide](.gemini/antigravity/brain/8ea0a3f3-a220-45a9-9bbc-79b75a66a2b9/artifacts/walkthrough.md)**.

---

# PostgreSQL cheat sheet:

| Task                           | Command                             | Description                                        |
| ------------------------------ | ----------------------------------- | -------------------------------------------------- |
| Open Command Prompt            | `Win + R` → `cmd`                   | Opens the Windows terminal.                        |
| Start PostgreSQL client        | `psql -U postgres`                  | Connects to PostgreSQL as the `postgres` user.     |
| Connect to a specific database | `psql -U postgres -d uc_coop_loans` | Connects directly to the `uc_coop_loans` database. |
| Exit PostgreSQL                | `\q`                                | Closes the `psql` session.                         |
| Show PostgreSQL version        | `psql --version`                    | Displays the installed PostgreSQL version.         |
| Show connection info           | `\conninfo`                         | Shows the current database, user, host, and port.  |

### Database Commands

| Task                  | Command                          |
| --------------------- | -------------------------------- |
| List databases        | `\l`                             |
| Create a database     | `CREATE DATABASE database_name;` |
| Connect to a database | `\c database_name`               |
| Delete a database     | `DROP DATABASE database_name;`   |
| Show current database | `SELECT current_database();`     |

### Table Commands

| Task             | Command         |
| ---------------- | --------------- |
| List tables      | `\dt`           |
| Describe a table | `\d table_name` |
| Show all schemas | `\dn`           |
| List views       | `\dv`           |

### Running SQL Files

| Task          | Command                      |
| ------------- | ---------------------------- |
| Run schema    | `\i 'D:/path/to/schema.sql'` |
| Run seed file | `\i 'D:/path/to/seed.sql'`   |

### User and Role Commands

| Task              | Command                                             |
| ----------------- | --------------------------------------------------- |
| Show current user | `SELECT current_user;`                              |
| List users/roles  | `\du`                                               |
| Change password   | `ALTER USER postgres WITH PASSWORD 'new_password';` |

### Basic SQL Queries

| Task                  | Command                                     |
| --------------------- | ------------------------------------------- |
| View all rows         | `SELECT * FROM users;`                      |
| View selected columns | `SELECT username, role FROM users;`         |
| Count rows            | `SELECT COUNT(*) FROM users;`               |
| Filter rows           | `SELECT * FROM users WHERE role = 'admin';` |
| Sort rows             | `SELECT * FROM users ORDER BY username;`    |

### Insert, Update, Delete

| Task        | Command                                                     |
| ----------- | ----------------------------------------------------------- |
| Insert data | `INSERT INTO users (...) VALUES (...);`                     |
| Update data | `UPDATE users SET role='manager' WHERE username='member1';` |
| Delete data | `DELETE FROM users WHERE username='member1';`               |

### Verify Your Project Database

| Task             | Command                             | Expected Result                         |
| ---------------- | ----------------------------------- | --------------------------------------- |
| Connect          | `psql -U postgres -d uc_coop_loans` | Connects successfully                   |
| List tables      | `\dt`                               | Shows `users`, `members`, `loans`, etc. |
| View users       | `SELECT * FROM users;`              | Shows `admin`, `manager`, `member1`     |
| Check connection | `\conninfo`                         | Displays `uc_coop_loans` and `postgres` |

## Typical Workflow

| Step | Command                             |
| ---- | ----------------------------------- |
| 1    | `cmd`                               |
| 2    | `psql -U postgres -d uc_coop_loans` |
| 3    | `\dt`                               |
| 4    | `SELECT * FROM users;`              |
| 5    | Make changes to your data or schema |
| 6    | `\q`                                |

### Notes

* Every SQL statement must end with a semicolon (`;`), for example:

  ```sql
  SELECT * FROM users;
  ```
* Commands that start with a backslash (such as `\l`, `\dt`, `\q`, and `\i`) are **`psql` meta-commands**, so they **do not** use a semicolon.

This set of commands should be enough for most development tasks when working with your `uc_coop_loans` database.
