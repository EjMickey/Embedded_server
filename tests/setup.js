
const mockData = {};

const mockCollection = (collectionName) => ({
    doc: (docId) => ({
        get: jest.fn(() => Promise.resolve({
            exists: mockData[collectionName]?.[docId] ? true : false,
            data: () => mockData[collectionName]?.[docId],
        })),
        set: jest.fn((data) => {
            if (!mockData[collectionName]) mockData[collectionName] = {};
            mockData[collectionName][docId] = data;
            return Promise.resolve();
        }),
        delete: jest.fn(() => {
            delete mockData[collectionName][docId];
            return Promise.resolve();
        }),
    }),
});

jest.mock("firebase-admin", () => ({
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn(() => ({
        collection: jest.fn((collectionName) => mockCollection(collectionName)),
    })),
    messaging: jest.fn(() => ({
        send: jest.fn().mockResolvedValue("OK")
    })),
}));

const resetMockData = () => {
    for (const col in mockData) delete mockData[col];
};

module.exports = { mockData, resetMockData };
