-- Seed Default Users (Password: password123)
-- Admin
INSERT INTO users (id, username, password_hash, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Manager
INSERT INTO users (id, username, password_hash, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'manager', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'manager')
ON CONFLICT (username) DO NOTHING;

-- Member User
INSERT INTO users (id, username, password_hash, role)
VALUES ('33333333-3333-3333-3333-333333333333', 'member1', '$2a$10$Fs7N3s3b2BWUb4mKBPXENuoVya.LliSmudMkloCn7zavqwJc8miD.', 'member')
ON CONFLICT (username) DO NOTHING;


-- Seed Member Profile linked to the member user
INSERT INTO members (id, user_id, first_name, last_name, middle_name, email, phone, address, date_of_birth, status)
VALUES (
    '44444444-4444-4444-4444-444444444444', 
    '33333333-3333-3333-3333-333333333333', 
    'John', 
    'Doe', 
    'Smith', 
    'johndoe@example.com', 
    '+639123456789', 
    '123 Mambaling Street, Cebu City', 
    '1990-01-15', 
    'active'
)
ON CONFLICT (email) DO NOTHING;


-- Seed Default Loan Products
INSERT INTO loan_products (name, interest_rate, term_months, amortization_type, min_amount, max_amount, is_active)
VALUES 
    ('Standard Salary Deduction Loan', 0.1200, 12, 'diminishing_balance', 5000.00, 100000.00, true),
    ('Cash Express', 0.0800, 3, 'flat_rate', 7000.00, 7000.00, true),
    ('Emergency Loan', 0.0400, 6, 'flat_rate', 5000.00, 5000.00, true),
    ('Micro Advance / Petty Loan', 0.0200, 1, 'flat_rate', 3000.00, 3000.00, true),
    ('Utility Bill Loan', 0.0300, 2, 'flat_rate', 3000.00, 3000.00, true),
    ('Occasion / Seasonal Loan', 0.0500, 6, 'flat_rate', 10000.00, 10000.00, true),
    ('Consumer Electronics / Laptop / Computer Loan', 0.0600, 12, 'flat_rate', 5000.00, 40000.00, true),
    ('Appliances & Furniture Loan', 0.0500, 12, 'flat_rate', 5000.00, 30000.00, true),
    ('Motorcycle & Vehicle Loan', 0.0800, 24, 'diminishing_balance', 20000.00, 120000.00, true),
    ('Jewelry / Valuables Loan', 0.0400, 6, 'flat_rate', 5000.00, 50000.00, true),
    ('Essential Commodities (Rice & Store Grocery Vouchers)', 0.0100, 2, 'flat_rate', 1000.00, 5000.00, true),
    ('Calamity Loan (Typhoon/Flood/Disaster)', 0.0150, 12, 'flat_rate', 5000.00, 20000.00, true),
    ('Mortuary / Bereavement Assistance Loan', 0.0200, 12, 'flat_rate', 5000.00, 15000.00, true),
    ('Project / Entrepreneurial Loan', 0.0700, 24, 'diminishing_balance', 10000.00, 150000.00, true)
ON CONFLICT (name) DO NOTHING;


-- Seed Initial Share Capital for John Doe
INSERT INTO share_capital_transactions (member_id, transaction_type, amount, balance_after, remarks)
VALUES ('44444444-4444-4444-4444-444444444444', 'credit', 25000.00, 25000.00, 'Initial Share Capital Contribution');


-- Seed Initial Fixed Deposit for John Doe
INSERT INTO fixed_deposits (id, member_id, principal_amount, interest_rate, placement_date, maturity_date, status)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    50000.00,
    0.0450,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    'active'
);

-- Seed Initial Transaction for Fixed Deposit
INSERT INTO fixed_deposit_transactions (fixed_deposit_id, transaction_type, amount)
VALUES ('55555555-5555-5555-5555-555555555555', 'deposit', 50000.00);
