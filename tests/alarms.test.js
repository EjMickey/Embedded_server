const request = require("supertest");
const app = require("../app");
const { resetMockData, mockData } = require("./setup");

beforeEach(async () => {
    resetMockData();

    await request(app)
        .post("/registerDevice")
        .send({
            station_id: "stationTest1",
            password: "abc123",
            name: "Test Station",
            ownerId: "user01",
        });

    mockData["alarm1"] = { name: "Temp Alarm", stations: ["stationTest1"] };
});

describe("ALARM LOGIC - functional tests", () => {
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
