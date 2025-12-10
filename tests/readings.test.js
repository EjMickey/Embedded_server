const request = require("supertest");
const app = require("../app");
const { resetMockData } = require("./setup");

beforeEach(() => resetMockData());

describe("READING ENDPOINT - functional tests", () => {
    beforeEach(async () => {
        await request(app)
            .post("/registerDevice")
            .send({
                station_id: "stationTest1124",
                password: "abc123",
                name: "Test Stationss",
                ownerId: "user01",
            });
    });

    test("TC-03: Save measurement – success", async () => {
        const res = await request(app)
            .post("/reading")
            .send({
                station_id: "stationTest1",
                password: "abc123",
                humidityAir: 40,
                humiditySoil: 15,
                temperatureAir: 21.5,
                pressureAir: 1012,
                sunlight: 300,
            });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    test("TC-04: Save measurement – wrong password", async () => {
        const res = await request(app)
            .post("/reading")
            .send({
                station_id: "stationTest1",
                password: "wrongPass",
                temperatureAir: 21.5,
            });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Invalid password");
    });

    test("TC-05: Save measurement – missing fields", async () => {
        const res = await request(app).post("/reading").send({});

        expect(res.status).toBe(400);
    });

    test("TC-06: measurement triggers an alarm", async () => {
        const res = await request(app)
            .post("/reading")
            .send({
                station_id: "stationTest1",
                password: "abc123",
                temperatureAir: 99,
            });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
