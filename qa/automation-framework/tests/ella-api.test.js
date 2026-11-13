const {
  api, createUser, createProduct, createTransaction, getProduct,
} = require('./helpers');

// ---------------------------------------------------------------
// 1. CRITICAL FLOW: user -> product -> transaction -> stock check
// ---------------------------------------------------------------
describe('Critical flow: create user -> choose product -> purchase', () => {
  const state = {};

  test('creates a user and returns a real id', async () => {
    const { res, body } = await createUser();
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.email).toBe(body.email);
    state.user = res.body.data;
  });

  test('creates a product with price 100 and stock 10', async () => {
    const { res } = await createProduct({ price: 100, quantity: 10 });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(100);
    expect(res.body.data.quantity).toBe(10);
    state.product = res.body.data;
  });

  test('creates a transaction for 2 units', async () => {
    const res = await createTransaction(state.user.id, state.product.id, 2);
    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(2);
    expect(res.body.data.user.id).toBe(state.user.id);
    expect(res.body.data.product.id).toBe(state.product.id);
    state.transaction = res.body.data;
  });

  test('[BUG-009] stock decreases from 10 to 8 after buying 2', async () => {
    const res = await getProduct(state.product.id);
    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(8);
  });

  test('the purchase appears under the user', async () => {
    const res = await api().get(`/users/${state.user.id}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.transactions.map((t) => t.id);
    expect(ids).toContain(state.transaction.id);
  });
});

// ---------------------------------------------------------------
// 2. KNOWN DEFECTS: each test fails until its bug is fixed
// ---------------------------------------------------------------
describe('Known defects (see qa/BUGS.md)', () => {
  test('[BUG-001] duplicate email is rejected with 409', async () => {
    const { body } = await createUser();
    const second = await api().post('/users').send(body);
    expect(second.status).toBe(409);
  });

  test('[BUG-002] invalid email format is rejected with 400', async () => {
    const { res } = await createUser({ email: 'abc' });
    expect(res.status).toBe(400);
  });

  test('[BUG-003] name made of spaces is rejected with 400', async () => {
    const { res } = await createUser({ name: '   ' });
    expect(res.status).toBe(400);
  });

  test.each(['users', 'products', 'transactions'])(
    '[BUG-004] GET /%s/abc returns 400, not 500',
    async (resource) => {
      const res = await api().get(`/${resource}/abc`);
      expect(res.status).toBe(400);
    },
  );

  test('[BUG-005] empty product name is rejected with 400', async () => {
    const { res } = await createProduct({ name: '' });
    expect(res.status).toBe(400);
  });

  test('[BUG-006] fractional quantity is rejected with 400, not 500', async () => {
    const { res } = await createProduct({ quantity: 1.5 });
    expect(res.status).toBe(400);
  });

  test('[BUG-007] negative price is rejected with 400', async () => {
    const { res } = await createProduct({ price: -5 });
    expect(res.status).toBe(400);
  });

  test('[BUG-008] updating a product keeps the new price', async () => {
    const { res, body } = await createProduct({ price: 250, quantity: 7 });
    const id = res.body.data.id;
    const update = await api()
      .put(`/products/${id}`)
      .send({ name: body.name, price: 300, quantity: 7 });
    expect(update.status).toBe(200);
    expect(Number(update.body.data.price)).toBe(300);
  });

  test('[BUG-009] cannot buy more units than remain in stock', async () => {
    const { res: u } = await createUser();
    const { res: p } = await createProduct({ quantity: 5 });
    const first = await createTransaction(u.body.data.id, p.body.data.id, 3);
    expect(first.status).toBe(201);
    const second = await createTransaction(u.body.data.id, p.body.data.id, 3);
    expect(second.status).toBe(409); // only 2 units are left
  });

  test('[BUG-010] price is a number in GET /products/:id', async () => {
    const { res } = await createProduct({ price: 100 });
    const got = await getProduct(res.body.data.id);
    expect(typeof got.body.data.price).toBe('number');
  });
});

// ---------------------------------------------------------------
// 3. EXPECTED BEHAVIOUR: these should pass today (regression set)
// ---------------------------------------------------------------
describe('Expected behaviour (regression)', () => {
  test('GET /users/99999 returns 404', async () => {
    const res = await api().get('/users/99999');
    expect(res.status).toBe(404);
  });

  test('POST /users without name returns 400', async () => {
    const res = await api().post('/users').send({ email: 'noname@test.com' });
    expect(res.status).toBe(400);
  });

  test('duplicate product name returns 409', async () => {
    const { body } = await createProduct();
    const second = await api().post('/products').send(body);
    expect(second.status).toBe(409);
  });

  test('transaction with quantity 0 returns 400', async () => {
    const { res: u } = await createUser();
    const { res: p } = await createProduct();
    const res = await createTransaction(u.body.data.id, p.body.data.id, 0);
    expect(res.status).toBe(400);
  });

  test('transaction with unknown user returns 404', async () => {
    const { res: p } = await createProduct();
    const res = await createTransaction(99999, p.body.data.id, 1);
    expect(res.status).toBe(404);
  });

  test('transaction with unknown product returns 404', async () => {
    const { res: u } = await createUser();
    const res = await createTransaction(u.body.data.id, 99999, 1);
    expect(res.status).toBe(404);
  });

  test('transaction above available stock returns 409', async () => {
    const { res: u } = await createUser();
    const { res: p } = await createProduct({ quantity: 10 });
    const res = await createTransaction(u.body.data.id, p.body.data.id, 1000);
    expect(res.status).toBe(409);
  });
});