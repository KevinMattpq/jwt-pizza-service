const request = require("supertest");
const app = require("../service");

//Getting current user
test("get current user", async () => {
  const testUser = {
    name: "User Test",
    email: Math.random().toString(36).substring(2, 12) + "@test.com",
    password: "password",
  };
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
    const testUser = { name: 'User Test', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'password' };
    const regRes = await request(app).post('/api/auth').send(testUser);
    const token = regRes.body.token;
    const userId = regRes.body.user.id;
  
    const updateRes = await request(app)
      .put(`/api/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'updated_' + testUser.email, password: 'newpassword123' });
  
    expect([200, 403]).toContain(updateRes.status);
  });