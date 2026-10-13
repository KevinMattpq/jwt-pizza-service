const request = require("supertest");
const app = require("../service");
const { Role, DB } = require('../database/database.js');

//Global User
const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

// Getting current user
test('get current user', async () => {
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(res.status).toBe(200);
  expect(res.body.email).toBe(testUser.email);
});

//Getting user without valid token
test("get current user", async () => {
    const res = await request(app).get('/api/user');
      expect(res.status).toBe(401);
  });

  //Updating user information 
  test('update user information', async () => {
    const testUser = { name: randomName(), email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'password' };
    const regRes = await request(app).post('/api/auth').send(testUser);
    const token = regRes.body.token;
    const userId = regRes.body.user.id;
  
    const updateRes = await request(app)
      .put(`/api/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'updated_' + testUser.email, password: 'newpassword123' });
  
    expect([200, 403]).toContain(updateRes.status);
  });

  test('list users unauthorized', async () => {
    const listUsersRes = await request(app).get('/api/user');
    expect(listUsersRes.status).toBe(401);
  });
    
  async function registerUser(service) {
    const testUser = {
      name: 'pizza diner',
      email: `${randomName()}@test.com`,
      password: 'a',
    };
    const registerRes = await service.post('/api/auth').send(testUser);
    registerRes.body.user.password = testUser.password;
  
    return [registerRes.body.user, registerRes.body.token];
  }

  //New Tests - Return a list of users
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

  test('list users returns registered users', async () => {
    const [user] = await registerUser(request(app));
    const [, adminToken] = await loginAdmin(request(app));
  
    const res = await request(app)
      .get('/api/user?limit=1000')
      .set('Authorization', 'Bearer ' + adminToken);
  
    expect(res.status).toBe(200);
    const found = res.body.users.find((u) => u.email === user.email);
    expect(found).toMatchObject({ id: user.id, name: user.name, email: user.email });
    expect(found.password).toBeUndefined();
  });


  // Handle the pagination of the list
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


  //Helper functions
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