import socket from "../socket";
import { SocketTester } from "socket.io-await-test";
describe.only("socket io client", () => {
  const tester = new SocketTester(socket);
  const restaurantData = tester.on("newResData");
  describe("when connecting", () => {
    beforeAll(() => {
      socket.emit("connection");
      socket.emit("joinMeal", 1, 2);
    });
    afterAll(() => {
      socket.emit("leaveMeal", 1, 2);
    });
    it("", async () => {
      socket.emit("like", 1, { id: 1, score: 16 });
      await restaurantData.waitForAny();
    });
  });
});
