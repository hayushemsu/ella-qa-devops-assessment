# Code Review Guidelines: Automated Test Code

Guidelines I use when reviewing automated tests from a junior QA engineer. The goal is to teach, so every comment explains the reason and offers a fix.

## 1. First pass: does it run and prove something?

- Pull the branch and run the suite locally. I do not approve tests I have not run.
- Run it twice. A test that passes once and fails once is flaky, and flaky tests are worse than no tests.
- Break the code on purpose (or revert a fix) and check that the test goes red. A test that cannot fail proves nothing.

## 2. Standards I enforce

### Clear purpose and naming
- The test name states the behaviour and the expected result: `[BUG-009] stock decreases from 10 to 8 after buying 2`, not `test3`.
- One reason to fail per test. Several unrelated assertions in one test hide which part broke.
- Tests are grouped by feature or flow (`describe` blocks), with one obvious entry point.

### Independence and test data
- Every test creates the data it needs, with unique values (timestamp suffix for emails and names), and does not rely on another test having run first. Ordered flows are allowed only when they are explicitly one flow, and they share state in one clearly named object.
- No hard-coded ids (`/users/1`) and no dependence on what is already in the database.
- Clean up, or run against a database that is reset for each run.

### Assertions
- Assert the status code **and** the important parts of the body, not only one of them.
- Assert exact values, not `toBeTruthy()` on something that could be anything.
- Assert the side effect, not only the response. After a purchase, read the product back and check the stock.
- No assertions that always pass (`expect(true).toBe(true)`), and no `try/catch` that swallows a failure.
- Negative tests check the **specific** error (400 vs 404 vs 409), not just "not 200".

### Reliability
- No `sleep` or fixed waits. Wait for a condition, or avoid waiting.
- No dependence on time, order of a list, or random values unless the seed is controlled.
- Timeouts are explicit and reasonable.

### Structure and maintainability
- Repeated steps live in helpers (`createUser`, `createProduct`, `createTransaction`), not copied into each test.
- Configuration (base URL, credentials) comes from environment variables, never from the test body.
- No secrets, tokens or personal data committed to the repository.
- No commented-out code, no `console.log` left behind, no `.only` or `.skip` without a linked ticket.
- Readable by someone new: a test is a short story of arrange, act, assert.

### Coverage and risk
- Positive path, negative cases and edge cases (boundaries, empty, huge, wrong type) for each rule being tested.
- The riskiest behaviour is covered first (money, stock, data loss). I ask "what happens if this fails in production?" and review in that order.
- Known bugs have a test that fails until the bug is fixed, with the bug id in the name.

### Pull request hygiene
- Small PRs with a description: what is tested, how to run it, what is not covered.
- Lint and formatting pass. CI is green.
- Commit messages say why, not only what.

## 3. How I write review comments

- Start with what is good, and be specific.
- Mark the severity: **blocker** (must fix), **suggestion** (should fix), **nit** (optional).
- Explain the reason, show a short example, and ask questions instead of giving orders ("What happens if this runs twice?").
- Pair for 15 minutes when the same issue appears twice.

## 4. Mock pull request review

**PR:** "Add transaction tests" by a junior QA engineer. Excerpt of the submitted code:

```js
test('test3', async () => {
  const r = await request('http://localhost:4000').post('/transactions')
    .send({ userId: 1, productId: 1, quantity: 2 });
  expect(r.status).toBe(201);
  const p = await request('http://localhost:4000').get('/products/1');
  expect(p.body.data.quantity).toBeTruthy();
});
```

**Review:**

> Nice start: you chose the right flow to automate, and checking the product after the purchase is the right instinct. A few things to change before merge.
>
> **Blocker 1: the stock assertion cannot fail.** `toBeTruthy()` passes for 12, for 8, and for 999. The expected value after buying 2 of 10 is 8, so assert `toBe(8)`. This test would currently go red (the stock is 12), and that is a real bug, so please link it to BUG-009 in the name.
>
> **Blocker 2: hard-coded ids `userId: 1, productId: 1`.** The test fails on a clean database and passes only on yours. Create the user and product inside the test (see `createUser` and `createProduct` in `helpers.js`) so the test is independent.
>
> **Suggestion 1: the name `test3` says nothing.** Try `[BUG-009] stock decreases from 10 to 8 after buying 2`, so a failing run tells the reader what broke without opening the file.
>
> **Suggestion 2: the base URL is repeated.** Move it to a helper that reads `BASE_URL` from the environment, so the same test runs locally, in CI and on staging.
>
> **Suggestion 3: only the happy path is covered.** Please add: quantity 0, a missing user, a missing product, and a quantity above the stock. Each should check the specific status code (400, 404, 404, 409).
>
> **Nit:** run the formatter (`npm run format`) so the chained calls are consistent.
>
> Happy to pair for 15 minutes on the data helpers if that is useful. Overall this is moving in the right direction.

## 5. Quick checklist (copy into PR templates)

- [ ] I ran it locally, twice, and it passed both times
- [ ] I made it fail on purpose to confirm it can fail
- [ ] Names describe behaviour and expected result
- [ ] Tests create their own data and do not share hidden state
- [ ] Assertions check status, body and side effects with exact values
- [ ] Negative tests check the specific error code
- [ ] No hard-coded ids, secrets, waits, `.only` or `.skip`
- [ ] Repeated steps are in helpers, configuration is from environment variables
- [ ] Riskiest behaviour is covered; known bugs have a failing test with the bug id
- [ ] Lint passes and CI is green