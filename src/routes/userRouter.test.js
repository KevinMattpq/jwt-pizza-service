const request = require("supertest");
const app = require("../service");

//Global User
const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

//Getting current user
test("get current user", async () => {
  const regRes = await request(app).post("/api/auth").send(testUser);
  const token = regRes.body.token;

  const res = await request(app)
    .get("/api/user")
    .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
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

  //Helper functions
  function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }
  
  function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }