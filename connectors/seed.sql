-- Insert Users (passwords are bcrypt hashed)
INSERT INTO foodtruck.users (name, email, password, role, status, birthdate)
VALUES 
('Hany Mostafa', 'hany.mostafa@student.giu-uni.de', '$2b$10$dC/cQ1tGlx.Qaj3CGcyZQuyUtd5HwnFGLqeWWU8hH92ptPKXrSWEG', 'admin', 'active', '1990-01-01'),
('Alice', 'alice@example.com', '$2b$10$gbZ3FiyehaJ88QP8znGgQ.X/nWi0r.WEzmqV1eaQzeX4Fr9CSmhRe', 'customer', 'active', '1995-03-15'),
('Bob', 'bob@example.com', '$2b$10$gbZ3FiyehaJ88QP8znGgQ.X/nWi0r.WEzmqV1eaQzeX4Fr9CSmhRe', 'customer', 'active', '1990-06-20'),
('Charlie', 'charlie@example.com', '$2b$10$gbZ3FiyehaJ88QP8znGgQ.X/nWi0r.WEzmqV1eaQzeX4Fr9CSmhRe', 'truckowner', 'active', '1985-11-05'),
('mohamed', 'mohamed@example.com', '$2b$10$ch8dBaYKsOre8h5WDKsppe98XmYSr7u8w3KLgoYs.y6QeQhN8KdeG', 'truckowner', 'active', '1985-11-01'),
('Ali', 'Ali@example.com', '$2b$10$ch8dBaYKsOre8h5WDKsppe98XmYSr7u8w3KLgoYs.y6QeQhN8KdeG', 'truckowner', 'active', '1987-11-04');
-- Insert Trucks
INSERT INTO foodtruck.trucks (truckname, trucklogo, ownerid, truckstatus, orderstatus)
VALUES
('Tasty Bites', 'https://example.com/logo1.png', 4, 'available', 'available'),
('Fast Eats', 'https://example.com/logo2.png', 5, 'available', 'available'),
('Street Food Express', 'https://example.com/street-logo.png', 6, 'available', 'available');

-- Insert Menu Items
INSERT INTO foodtruck.menuitems (truckid, name, description, price, category, status)
VALUES
(1, 'Cheeseburger', 'Juicy beef burger with cheese', 25.50, 'Main', 'available'),
(2, 'Fries', 'Crispy golden fries', 10.00, 'Side', 'available'),
(3, 'Chicken Wrap', 'Grilled chicken wrap', 20.00, 'Main', 'available');


