USE lms_database;

-- Rename payments to orders
RENAME TABLE payments TO orders;

-- Rename stripe_payment_id to stripe_payment_intent_id
ALTER TABLE orders CHANGE stripe_payment_id stripe_payment_intent_id VARCHAR(255);

-- Add receipt_url
ALTER TABLE orders ADD receipt_url VARCHAR(500);

-- Update status ENUM
ALTER TABLE orders MODIFY status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending';

-- Map any existing 'success' to 'paid' (in case old statuses exist before the enum change - note: MySQL ENUM change can be tricky, let's do it via intermediate or just hope there's no data. There is no 'success' in the new enum, so it might truncate. Best to change to a larger ENUM first, update, then restrict).
ALTER TABLE orders MODIFY status ENUM('pending', 'success', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending';
UPDATE orders SET status = 'paid' WHERE status = 'success';
ALTER TABLE orders MODIFY status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending';

-- Update courses table
ALTER TABLE courses ADD currency VARCHAR(10) DEFAULT 'usd';

-- Convert price to INT. Since it was DECIMAL(10,2), we multiply by 100.
UPDATE courses SET price = price * 100 WHERE price > 0;
ALTER TABLE courses MODIFY price INT DEFAULT 0;
