# API Endpoints Verification Checklist

**Server:** http://localhost:3000
**Status:** ✅ Running

---

## Public Endpoints (No Authentication Required)

### ☐ 1. Register New User
```
POST http://localhost:3000/api/register
Body (JSON):
{
  "email": "test@example.com",
  "password": "test123",
  "name": "Test User",
  "role": "customer"
}
Expected: 201 - User registered successfully
```

### ☐ 2. User Login
```
POST http://localhost:3000/api/login
Body (JSON):
{
  "email": "alice@example.com",
  "password": "pass123"
}
Expected: 200 - Login successful (saves cookie)
```

---

## Customer Endpoints (Login as alice@example.com or bob@example.com)

### ☐ 3. View All Available Trucks
```
GET http://localhost:3000/api/trucks/view
Expected: 200 - Array of available trucks
```

### ☐ 4. View Truck Menu
```
GET http://localhost:3000/api/menuItem/truck/1
Expected: 200 - Array of menu items for truck ID 1
```

### ☐ 5. Filter Menu by Category
```
GET http://localhost:3000/api/menuItem/truck/1/category/Main
Expected: 200 - Array of menu items in "Main" category
```

### ☐ 6. Add Item to Cart
```
POST http://localhost:3000/api/cart/new
Body (JSON):
{
  "itemId": 1,
  "quantity": 2
}
Expected: 200 - "item added to cart successfully"
```

### ☐ 7. View Cart
```
GET http://localhost:3000/api/cart/view
Expected: 200 - Array of cart items with item names
```

### ☐ 8. Update Cart Quantity
```
PUT http://localhost:3000/api/cart/edit/1
Body (JSON):
{
  "quantity": 3
}
Expected: 200 - "cart updated successfully"
Note: Replace "1" with actual cartId from step 7
```

### ☐ 9. Remove from Cart
```
DELETE http://localhost:3000/api/cart/delete/1
Expected: 200 - "item removed from cart successfully"
Note: Replace "1" with actual cartId
```

### ☐ 10. Place Order
```
POST http://localhost:3000/api/order/new
Body (JSON): {}
Expected: 201 - "order placed successfully" with orderId
Note: Must have items in cart first
```

### ☐ 11. View My Orders
```
GET http://localhost:3000/api/order/myOrders
Expected: 200 - Array of customer orders (newest first)
```

### ☐ 12. View Order Details
```
GET http://localhost:3000/api/order/details/1
Expected: 200 - Order with items array
Note: Replace "1" with actual orderId from step 11
```

---

## Truck Owner Endpoints (Login as charlie@example.com)

### ☐ 13. Create Menu Item
```
POST http://localhost:3000/api/menuItem/new
Body (JSON):
{
  "itemName": "Test Burger",
  "itemDescription": "Delicious test burger",
  "itemPrice": 12.99,
  "itemCategory": "Main",
  "truckId": 1,
  "itemImageUrl": "https://example.com/burger.jpg"
}
Expected: 201 - "menu item created successfully" with itemId
```

### ☐ 14. View My Menu Items
```
GET http://localhost:3000/api/menuItem/view
Expected: 200 - Array of all menu items for owner's trucks
```

### ☐ 15. View Specific Menu Item
```
GET http://localhost:3000/api/menuItem/view/1
Expected: 200 - Single menu item details
Note: Replace "1" with actual itemId from step 14
```

### ☐ 16. Edit Menu Item
```
PUT http://localhost:3000/api/menuItem/edit/1
Body (JSON):
{
  "itemName": "Updated Burger",
  "itemPrice": 14.99
}
Expected: 200 - "menu item updated successfully"
Note: Replace "1" with actual itemId
```

### ☐ 17. Delete Menu Item
```
DELETE http://localhost:3000/api/menuItem/delete/1
Expected: 200 - "menu item deleted successfully"
Note: Replace "1" with actual itemId (soft delete)
```

### ☐ 18. View My Truck Information
```
GET http://localhost:3000/api/trucks/myTruck
Expected: 200 - Array of trucks owned by charlie (3 trucks)
```

### ☐ 19. Update Truck Availability
```
PUT http://localhost:3000/api/trucks/updateOrderStatus
Body (JSON):
{
  "truckId": 1,
  "orderStatus": "unavailable"
}
Expected: 200 - "Truck order status updated successfully"
```

### ☐ 20. View Order Details (Truck Owner)
```
GET http://localhost:3000/api/order/truckOwner/1
Expected: 200 - Order details with customer info and items
Note: Replace "1" with actual orderId
```

### ☐ 21. View All Truck Orders
```
GET http://localhost:3000/api/order/truckOrders
Expected: 200 - Array of orders for owner's truck with customer names
```

### ☐ 22. Update Order Status
```
PUT http://localhost:3000/api/order/updateStatus/1
Body (JSON):
{
  "orderStatus": "preparing",
  "estimatedEarliestPickup": "2024-12-13T14:00:00Z"
}
Expected: 200 - "order status updated successfully"
Note: Status values: pending, preparing, ready, completed, cancelled
```

---

## Test Credentials

### Customer Accounts
- **Email:** alice@example.com | **Password:** pass123
- **Email:** bob@example.com | **Password:** pass123

### Truck Owner Account
- **Email:** charlie@example.com | **Password:** pass123
- **Owns:** Trucks 1, 2, 3

---

## Testing Sequence

### Sequence 1: Customer Flow (Login as Alice)
1. ✓ Login (step 2)
2. ✓ View trucks (step 3)
3. ✓ View truck menu (step 4)
4. ✓ Add to cart (step 6)
5. ✓ View cart (step 7)
6. ✓ Update cart (step 8)
7. ✓ Place order (step 10)
8. ✓ View my orders (step 11)
9. ✓ View order details (step 12)

### Sequence 2: Truck Owner Flow (Login as Charlie)
1. ✓ Login (step 2 with charlie credentials)
2. ✓ View my trucks (step 18)
3. ✓ View my menu items (step 14)
4. ✓ Create menu item (step 13)
5. ✓ Edit menu item (step 16)
6. ✓ View truck orders (step 21)
7. ✓ View order details (step 20)
8. ✓ Update order status (step 22)
9. ✓ Update truck availability (step 19)

---

## ✅ Verification Status

- [ ] All 22 endpoints tested
- [ ] Customer flow complete
- [ ] Truck owner flow complete
- [ ] Authentication working correctly
- [ ] All responses match expected format
- [ ] Ready for frontend implementation

---

## Notes
- Cookie-based authentication - Postman automatically handles cookies
- Must login before testing authenticated endpoints
- Use actual IDs from responses in subsequent requests
- All endpoints use `/api` prefix (not `/api/v1`)
