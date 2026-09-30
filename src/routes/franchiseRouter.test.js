const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  user = await DB.addUser(user);
  return { ...user, password: "toomanysecrets" };
}

//Get all franchise Test
test("get franchise", async () => {
  const res = await request(app).get("/api/franchise");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.franchises)).toBe(true);
  expect(typeof res.body.more).toBe("boolean");
});

//Get User's franchise
test("get franchise", async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(admin);
  const adminToken = loginRes.body.token;
  const userRes = await request(app)
    .get(`/api/franchise/${admin.id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(userRes.status).toBe(200);
});

//Deleting a franchise
test("Delete franchise", async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(admin);
  const adminToken = loginRes.body.token;
  
  const fRes = await request(app)
    .post(`/api/franchise`)
    .set("Authorization", `Bearer ${adminToken}`).send({ name: randomName(), admins: [{ email: admin.email }] });
  expect(fRes.status).toBe(200);
  const franchiseId = fRes.body.id;

  const deleteRes = await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(deleteRes.status).toBe(200);

});

//Creating a franchise as admin
test("create franchise as admin", async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(admin);
  const adminToken = loginRes.body.token;

  const franchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: randomName(), admins: [{ email: admin.email }] });

  expect(franchiseRes.status).toBe(200);
});

//Opening a store as an admin
test("Opening store as admin", async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(admin);
  const adminToken = loginRes.body.token;

  // Create franchise
  const fRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: randomName(), admins: [{ email: admin.email }] });

  const franchiseId = fRes.body.id;

  // Create store
  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ franchiseId, name: randomName() });

  expect(storeRes.status).toBe(200);

  // Deleting store
  const delRes = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeRes.body.id}`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(delRes.status).toBe(200);
});
