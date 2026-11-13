const request = require('supertest');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

const api = () => request(BASE_URL);

// Unique suffix so repeated runs never collide on unique emails or names.
const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function createUser(overrides = {}) {
  const id = uid();
  const body = { name: `QA User ${id}`, email: `qa.${id}@test.com`, ...overrides };
  const res = await api().post('/users').send(body);
  return { res, body };
}

async function createProduct(overrides = {}) {
  const id = uid();
  const body = { name: `QA Product ${id}`, price: 100, quantity: 10, ...overrides };
  const res = await api().post('/products').send(body);
  return { res, body };
}

async function createTransaction(userId, productId, quantity) {
  return api().post('/transactions').send({ userId, productId, quantity });
}

const getProduct = (id) => api().get(`/products/${id}`);

module.exports = { api, uid, createUser, createProduct, createTransaction, getProduct };