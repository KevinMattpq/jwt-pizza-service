const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

// Global user
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

// Get current user
test('get current user', async () => {
  const res = await request(app).get('/api/user/me').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  expect(res.body.email).toBe(testUser.email);
});

test('get current user without token', async () => {
  const res = await request(app).get('/api/user/me');
  expect(res.status).toBe(401);
});

// Update user
test('update user information', async () => {
  const [user, token] = await registerUser(request(app));
  const updateRes = await request(app)
    .put(`/api/user/${user.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: user.name, email: 'updated_' + user.email, password: 'newpassword123' });
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.user.email).toBe('updated_' + user.email);
});

// List users: authorization
test('list users unauthorized', async () => {
  const res = await request(app).get('/api/user');
  expect(res.status).toBe(401);
});

test('list users as diner is forbidden', async () => {
  const [, userToken] = await registerUser(request(app));
  const res = await request(app).get('/api/user').set('Authorization', 'Bearer ' + userToken);
  expect(res.status).toBe(403);
});

test('list users as admin', async () => {
  const [, adminToken] = await loginAdmin(request(app));
  const res = await request(app).get('/api/user').set('Authorization', 'Bearer ' + adminToken);
  expect(res.status).toBe(200);
});

// List users: return a list of users
test('list users returns registered users', async () => {
  const uniqueName = 'pizza_' + randomName();
  const regRes = await request(app)
    .post('/api/auth')
    .send({ name: uniqueName, email: `${randomName()}@test.com`, password: 'a' });
  const user = regRes.body.user;
  const [, adminToken] = await loginAdmin(request(app));

  const res = await request(app).get(`/api/user?name=${uniqueName}`).set('Authorization', 'Bearer ' + adminToken);
  expect(res.status).toBe(200);
  const found = res.body.users.find((u) => u.email === user.email);
  expect(found).toMatchObject({ id: user.id, name: user.name, email: user.email });
  expect(found.password).toBeUndefined();
});

// List users: pagination
test('list users paginates', async () => {
  await registerUser(request(app));
  await registerUser(request(app));
  const [, adminToken] = await loginAdmin(request(app));

  const page1 = await request(app).get('/api/user?page=1&limit=1').set('Authorization', 'Bearer ' + adminToken);
  expect(page1.status).toBe(200);
  expect(page1.body.users.length).toBe(1);
  expect(page1.body.more).toBe(true);

  const page2 = await request(app).get('/api/user?page=2&limit=1').set('Authorization', 'Bearer ' + adminToken);
  expect(page2.body.users.length).toBe(1);
  expect(page2.body.users[0].id).not.toBe(page1.body.users[0].id);
});

// List users: name filter
test('list users filters by name', async () => {
  const uniqueName = 'pizza_' + randomName();
  await request(app)
    .post('/api/auth')
    .send({ name: uniqueName, email: `${randomName()}@test.com`, password: 'a' });
  const [, adminToken] = await loginAdmin(request(app));

  const exact = await request(app).get(`/api/user?name=${uniqueName}`).set('Authorization', 'Bearer ' + adminToken);
  expect(exact.status).toBe(200);
  expect(exact.body.users.length).toBe(1);
  expect(exact.body.users[0].name).toBe(uniqueName);
  expect(exact.body.more).toBe(false);

  const wildcard = await request(app)
    .get(`/api/user?name=${uniqueName.slice(0, 8)}*`)
    .set('Authorization', 'Bearer ' + adminToken);
  expect(wildcard.body.users.some((u) => u.name === uniqueName)).toBe(true);
});

//Delete Users
test('delete user unauthorized', async () => {
  const res = await request(app).delete('/api/user/1');
  expect(res.status).toBe(401);
});

test('delete user as diner is forbidden', async () => {
  const [victim] = await registerUser(request(app));       // the user someone tries to delete
  const [, dinerToken] = await registerUser(request(app)); // a regular diner

  const res = await request(app)
    .delete(`/api/user/${victim.id}`)
    .set('Authorization', 'Bearer ' + dinerToken);

  expect(res.status).toBe(403);
});

// Helper functions
async function registerUser(service) {
  const user = { name: 'pizza diner', email: `${randomName()}@test.com`, password: 'a' };
  const registerRes = await service.post('/api/auth').send(user);
  registerRes.body.user.password = user.password;
  return [registerRes.body.user, registerRes.body.token];
}

async function loginAdmin(service) {
  const password = 'toomanysecrets';
  const name = randomName();
  const admin = await DB.addUser({ name, email: `${name}@admin.com`, password, roles: [{ role: Role.Admin }] });
  const loginRes = await service.put('/api/auth').send({ email: admin.email, password });
  return [admin, loginRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}