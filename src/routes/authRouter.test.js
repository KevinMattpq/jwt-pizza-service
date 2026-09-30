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

//Register test
test("register", async () => {
  const username = randomName();
  const newUser = {
    name: username,
    email: `${username}@test.com`,
    password: "testPassword123",
  };
  const registerRes = await request(app).post("/api/auth").send(newUser);
  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);

  const expectedUser = { ...newUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(registerRes.body.user).toMatchObject(expectedUser);
});

//Register with a missing field - Error
test("register with missing field", async () => {
  const username = randomName();
  const newUser = {
    name: username,
    email: ``,
    password: "testPassword123",
  };
  const registerRes = await request(app).post("/api/auth").send(newUser);
  expect(registerRes.status).toBe(400);
});

//Testing Login
test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

//Testing Login - wrong password
test("login", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: testUser.email, password: "WrongPassword" });
  expect(loginRes.status).toBe(404);
});

//Logout Test
test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toMatch(/logout/i);
});

//Helper functions
function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }
  
  function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }
  