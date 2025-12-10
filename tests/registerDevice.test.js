const request = require("supertest");
const app = require("../app");
const { resetMockData } = require("./setup");

beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
});

describe("REGISTER DEVICE - functional tests", () => {
    test("TC-01: Register device – success", async () => {
        const res = await request(app)
            .post("/registerDevice")
            .send({
                station_id: "stationTest1234",
                password: "abc123",
                name: "Test Station",
                ownerId: "user01"
            });
            console.log("RESP:", res.status, res.body);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    
    });

    test("TC-02: Register device – ID already exists", async () => {
        await request(app)
            .post("/registerDevice")
            .send({
                station_id: "stationTest1",
                password: "abc123",
                name: "Test Station",
                ownerId: "user01"
            });

        const res = await request(app)
            .post("/registerDevice")
            .send({
                station_id: "stationTest1",
                password: "abc123",
                name: "Test Station",
                ownerId: "user01"
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Device already exists");
    });
});
