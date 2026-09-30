const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

//Creating a global user (diner)
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

//Get Menu
test('get menu', async () => {
  const res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

//Adding menu item as admin
test('adding menu item as admin', async () => {
    const adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const adminToken = loginRes.body.token;
    expect(loginRes.status).toBe(200);

    const title = randomName()

    const res = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminToken}`).send({ title, description: 'test pizza', image: 'pizza1.png', price: 0.01 });
    expect(res.status).toBe(200);
    const arrayResponse = res.body
    const item = arrayResponse.find((x)=> x.title === title)
    expect(item).toBeDefined();
})

//Creating an order
test('create order', async () => {
    const orderRes = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send({
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 0.05 }],
      });
  
    expect([200, 400, 404]).toContain(orderRes.status);
  });
  
  //getting user's orders
  test('get user orders', async () => {
    const res = await request(app)
      .get('/api/order')
      .set('Authorization', `Bearer ${testUserAuthToken}`);
  
    expect(res.status).toBe(200);
  });

  async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }

//Helper functions
  function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }
  function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }