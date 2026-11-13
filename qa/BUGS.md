# Bug Reports: Ella API

**Environment:** NestJS API on localhost:4000, PostgreSQL 16 (Docker, host port 5433), Node v26, Windows 11.
**Method:** Exploratory testing with Swagger and curl, plus code review of the service and DTO files.
**Note:** To get the project to compile I changed `as User` to `as unknown as User` in `users.service.ts` (the original line fails with TS2352). No other source code was changed.

| ID | Title | Severity |
|---|---|---|
| BUG-001 | Duplicate email on POST /users returns fake 201 with id 0 | High |
| BUG-002 | Invalid email format accepted | Medium |
| BUG-003 | Name made only of spaces accepted | Low |
| BUG-004 | Non-numeric id returns 500 and leaks a database error | Medium |
| BUG-005 | Empty product name accepted | Low |
| BUG-006 | Fractional quantity returns 500 and leaks a database error | Medium |
| BUG-007 | Negative price accepted | High |
| BUG-008 | Product update overwrites price with quantity | High |
| BUG-009 | Purchase increases stock instead of decreasing it | Critical |
| BUG-010 | Product price returned as a string by some endpoints | Low |

---

### BUG-001: Duplicate email returns 201 "User created successfully" with a fake user (id 0)
**Severity:** High | **Endpoint:** POST /users

**Steps to reproduce**
1. POST /users `{"name":"Hayat","email":"hayat@test.com"}` returns 201, id 2.
2. Send the identical body again.

**Actual:** 201 "User created successfully", data `{"name":"Hayat","email":"hayat@test.com","id":0,"transactions":[]}`, with no createdAt/updatedAt. GET /users shows no new record.
**Expected:** 409 Conflict "Email already exists".
**Root cause:** `users.service.ts`, `create()` catch block. On PostgreSQL error 23505 it returns a fabricated 201 response instead of throwing `ConflictException`. `update()` in the same file handles the same case correctly with 409.
**Impact:** The client believes the account exists and holds id 0, which does not exist. Later calls (for example POST /transactions) fail or misbehave.
**Evidence:** response payload above; GET /users showing only the original records. The same fake response appeared on repeated duplicate attempts.

### BUG-002: Invalid email format accepted
**Severity:** Medium | **Endpoint:** POST /users

**Steps:** POST `{"name":"Hayat","email":"abc"}`
**Actual:** 201, user id 13 saved with email "abc".
**Expected:** 400 "email must be an email".
**Root cause:** `create-user.dto.ts`: `email` only has `@IsNotEmpty()`. It has no `@IsEmail()` or `@IsString()`, so any non-empty value passes.
**Impact:** Bad data in the database; emails to these users will fail.
**Evidence:** response payload (id 13).

### BUG-003: Name made only of spaces is accepted
**Severity:** Low | **Endpoint:** POST /users

**Steps:** POST `{"name":"   ","email":"space@test.com"}`
**Actual:** 201, user id 14 saved with a blank name.
**Expected:** 400, e.g. "Name must not be blank".
**Root cause:** `create-user.dto.ts` uses `@IsNotEmpty()`, which only rejects "", null and undefined. Spaces pass and there is no trim.
**Impact:** Users with blank display names.
**Evidence:** response payload (id 14).

### BUG-004: Non-numeric id returns 500 and leaks a database error
**Severity:** Medium | **Endpoint:** GET /users/{id}, GET /products/{id}, GET /transactions/{id} (PUT routes not tested)

**Steps:** GET /users/abc, GET /products/abc, GET /transactions/abc
**Actual:** HTTP 500 on all three, for example `{"statusCode":500,"message":"Error retrieving user","error":"invalid input syntax for type integer: \"NaN\""}`
**Expected:** 400 Bad Request, e.g. "id must be a number", with no internal details.
**Root cause (suspected):** The id parameter is converted to a number without validation (no `ParseIntPipe`), so NaN reaches PostgreSQL. The generic catch in each service returns a 500 with `error.message`.
**Impact:** Client errors appear as server errors, which pollutes monitoring and alerts, and database details are exposed.
**Evidence:**
- GET /users/abc returns 500, "Error retrieving user"
- GET /products/abc returns 500, "Error retrieving product"
- GET /transactions/abc returns 500, "Error retrieving transaction"

### BUG-005: Empty product name accepted
**Severity:** Low | **Endpoint:** POST /products

**Steps:** POST `{"name":"","price":10,"quantity":5}`
**Actual:** 201, product id 2 saved with name "".
**Expected:** 400 "name should not be empty".
**Root cause:** `create-product.dto.ts`: `name` has only `@IsString()`, with no `@IsNotEmpty()`.
**Evidence:** response payload (id 2).

### BUG-006: Fractional quantity causes HTTP 500 and leaks a database error
**Severity:** Medium | **Endpoint:** POST /products

**Steps:** POST `{"name":"Bad3","price":10,"quantity":1.5}`
**Actual:** 500, `{"message":"Error creating product","error":"invalid input syntax for type integer: \"1.5\""}`
**Expected:** 400 "quantity must be an integer".
**Root cause:** `create-product.dto.ts`: `quantity` has `@IsNumber()` and `@Min(0)` but no `@IsInt()`. PostgreSQL rejects the value and the generic catch returns a 500 with the raw database message.
**Impact:** Client error shown as a server error; internal details exposed.
**Evidence:** response payload above.

### BUG-007: Negative price accepted
**Severity:** High | **Endpoint:** POST /products

**Steps:** POST `{"name":"Neg1","price":-5,"quantity":5}`
**Actual:** 201, product id 6 saved with price -5.
**Expected:** 400 "price must not be less than 0".
**Root cause:** `create-product.dto.ts`: `price` has only `@IsNumber()`. `quantity` has `@Min(0)` but `price` does not.
**Impact:** Negative prices make purchase totals negative (wrong revenue or refunds).
**Evidence:** response payload (id 6).

### BUG-008: Product update overwrites price with quantity
**Severity:** High | **Endpoint:** PUT /products/{id}

**Steps:**
1. POST /products `{"name":"Phone","price":250,"quantity":7}` returns id 3.
2. PUT /products/3 `{"name":"Phone","price":300,"quantity":7}`

**Actual:** 200, `data.price` = 7 (the quantity value). The price 300 is lost.
**Expected:** 200, `data.price` = 300.
**Root cause:** `products.service.ts`, `update()`: `product.price = dto.quantity ?? product.price;` should read `dto.price`.
**Impact:** Every product edit silently corrupts its price.
**Evidence:** response payload above.

### BUG-009: Purchase increases product stock instead of decreasing it (oversell possible)
**Severity:** Critical | **Endpoint:** POST /transactions

**Steps:**
1. POST /products `{"name":"Laptop","price":100,"quantity":10}` returns id 1.
2. POST /transactions `{"userId":2,"productId":1,"quantity":2}` returns 201.
3. GET /products/1 shows quantity 12.
4. POST /transactions `{"userId":2,"productId":1,"quantity":11}` returns 201.
5. POST /transactions `{"userId":2,"productId":1,"quantity":100}` returns 409 "exceeds available stock (23)".

**Actual:** Stock increases after every purchase (10, 12, 23). A purchase of 11 is accepted although only 8 units should remain.
**Expected:** Stock decreases (10 to 8). The purchase of 11 is rejected with 409.
**Root cause:** `transactions.service.ts`, `create()`: `product.quantity += dto.quantity;` should be `-=`. The OUT_OF_STOCK check (`product.quantity === 0`) can never trigger after a purchase.
**Impact:** Inventory is wrong after every sale and the shop can sell more than it owns.
**Evidence:** transaction responses (ids 1 and 2), GET /products/1 (quantity 12), the 409 message

---

### BUG-011: Timestamps depend on the server's time zone
**Severity:** Medium | **Endpoint:** all endpoints that return createdAt / updatedAt (found while running the Docker stack)

**Steps:**
1. Create a user with the API running locally on a machine in UTC+3. Response: `createdAt` 2026-11-12T14:02:57Z, while the response `date` header says 17:02:57 GMT.
2. Run the same API in Docker (container time zone UTC) against the same database and call GET /users.

**Actual:** The same row (id 1) returns `14:02:57Z` locally and `17:02:57Z` in Docker. The value changes with the time zone of the server process.
**Expected:** One unambiguous UTC instant, identical in every environment.
**Root cause (suspected, to confirm in the entity files):** the date columns are `timestamp without time zone`, and the driver reads them in the process's local time zone.
**Impact:** Sorting, reports and audit logs disagree between environments, and times shift by the server's UTC offset.
**Evidence:** GET /users output from both runs, plus the `date` header from the first response.