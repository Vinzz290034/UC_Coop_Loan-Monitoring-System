# Authentication & Registration Architecture Flow

This document details the step-by-step security and session management lifecycle of the Loan Monitoring and Financial Management System.

---

## 1. User Account Registration Flow

```mermaid
sequenceDiagram
    actor Admin as Admin / Manager
    participant FE as Frontend Portal
    participant BE as Express Backend API
    database DB as PostgreSQL DB

    Admin->>FE: Inputs user details (Username, Password, Role, Member ID)
    FE->>BE: POST /api/auth/register (JWT Auth Header required)
    Note over BE: Verifies role is Admin/Manager<br/>Salts password & hashes with Bcrypt
    BE->>DB: INSERT INTO users (username, password_hash, role, member_id)
    DB-->>BE: Returns created record
    BE-->>FE: Returns 201 Created (Success JSON)
    FE-->>Admin: Displays account registry confirmation
```

### Steps:
1. **Administrative Boundary**: Account registration is restricted exclusively to **Admin** and **Manager** accounts. Standard cooperative members cannot register themselves to prevent unauthorized workspace access.
2. **Form Entry**: The Administrator selects a registered member from the roster and creates a unique username, password, and system role (`admin`, `manager`, `member`).
3. **Database Encryption**: On receipt of the `POST /api/auth/register` request, the Express backend uses the `bcryptjs` library to generate a cryptographically strong salt and hash the plaintext password. The plaintext is never stored.
4. **Linkage**: The user record is created in the database and linked to the corresponding `members.id` profile.

---

## 2. Authentication Login Flow

```mermaid
sequenceDiagram
    actor User as User / Member
    participant FE as Frontend (/login)
    participant BE as Express Backend API
    database DB as PostgreSQL DB

    User->>FE: Enters credentials (Username, Password)
    FE->>BE: POST /api/auth/login (Payload: username, password)
    BE->>DB: SELECT * FROM users WHERE username = $1
    DB-->>BE: Returns matching user record
    Note over BE: Compares plaintext with Bcrypt hash
    alt Credentials Match
        Note over BE: Signs JWT with secret key & claims (id, role)
        BE-->>FE: Returns 200 OK (Token + User Profile metadata)
        FE->>FE: Stores Token in localStorage
        FE->>FE: Redirects to /dashboard
        FE-->>User: Welcomes user to Dashboard
    else Credentials Invalid
        BE-->>FE: Returns 401 Unauthorized (Error msg)
        FE-->>User: Displays error notification
    end
```

### Steps:
1. **Login Prompt**: The user enters their username/email and password on the frontend page `/login`.
2. **API Verification**: The credentials are sent as a JSON payload to `POST /api/auth/login`.
3. **Hash Comparison**: The backend queries the user from the database. It compares the entered password with the stored hash using `bcrypt.compare()`.
4. **Token Generation**: If verified, the server signs a JSON Web Token (JWT) with user claims (e.g. `userId`, `username`, `role`) and an expiration period (typically 1 hour).
5. **Success Response**: The server returns a `200 OK` response with:
   - The signed JWT string.
   - The user profile details (full name, member ID, etc.).

---

## 3. Session Lifecycle & Axios Request Interceptors

Once the user is logged in, their session is maintained seamlessly across requests:

1. **Storage**: The frontend handles the successful login by storing the JWT token in `localStorage` under the key `'token'`.
2. **Axios Client Setup**: The central Axios client instance in [api.ts](file:///d:/Documents/Programming/LoanMonitoring/UC_Coop_Loan-Monitoring-System/frontend/src/lib/api.ts) contains a request interceptor that runs before every outgoing request.
3. **Dynamic Token Injection**:
   - The interceptor checks for the token in `localStorage`.
   - If present, it attaches the `Authorization: Bearer <token>` header to the request.
4. **Error Interception (`401 Unauthorized`)**:
   - The Axios client also has a response interceptor.
   - If the backend rejects a request with a `401 Unauthorized` status (meaning the token expired or is invalid), the interceptor automatically clears the token from `localStorage` and triggers a redirect to the `/login` route.

---

## 4. Client-Side Route Protection & Guard Rails

Next.js App Router route guards are managed in the dashboard layout:

* **Context Evaluation**: [AuthContext.tsx](file:///d:/Documents/Programming/LoanMonitoring/UC_Coop_Loan-Monitoring-System/frontend/src/context/AuthContext.tsx) evaluates the authenticated user state when pages render.
* **Unauthenticated Access Guard**:
  - If a user attempts to load any sub-path inside the `/dashboard` folder group (e.g., `/dashboard/members`) and is not logged in, the application immediately redirects them to `/login`.
* **Role-Based Privilege Guards**:
  - Standard cooperative members are restricted from loading administrative views like Billing and Collections (`/billing`) or Analytical Audits (`/reports`).
  - If a member attempts to access these paths, the dashboard shell blocks the page content rendering and displays a "Restricted Access Clearance Required" warning.
