import * as factories from "../../models/factories/index.js";
import Meal from "../../models/meals.js";
import chaiHttp, { request } from "chai-http";
import { expect } from "chai";
import { app } from "../../server.js";
import User from "../../models/users.js";
import Guest from "../../models/guests.js";
import jwt from "jsonwebtoken";
import moment from "moment/moment.js";

// chai.use(chaiHttp);

describe("Meals Controller", () => {
  const setUpTest = async () => {
    const pastMeal = await factories.meal({
      scheduled_at: moment().subtract(2, "hours").toDate(),
    });

    const futureMeal = await factories.meal({
      scheduled_at: moment().add(1, "day").toDate(),
    });

    const user = await factories.user({
      username: "Test1",
      password: "password",
    });

    await factories.guest({
      user_id: user.id,
      meal_id: pastMeal.id,
      role: "admin",
    });

    await factories.guest({
      user_id: user.id,
      meal_id: futureMeal.id,
      role: "admin",
    });

    const login = await request
      .execute(app)
      .post("/login")
      .send({ username: "Test1", password: "password" });
    expect(login.status).to.eql(200);

    const authToken = "Bearer " + login.body.accessToken;

    return { pastMeal, futureMeal, user, authToken };
  };

  afterEach(async () => {
    await Meal.truncate();
    await User.truncate();
    await Guest.truncate();
  });

  after(() => {
    app.closeServer();
  });

  describe("meals_list_by_user_id", () => {
    it("returns the meal data", async () => {
      const { pastMeal, authToken } = await setUpTest();

      const res = await request
        .execute(app)
        .get("/meals")
        .set("Authorization", authToken);

      expect(res.body.meals[0]).to.eql({
        meal_name: pastMeal.meal_name,
        scheduled_at: pastMeal.scheduled_at.toISOString(),
        location_id: pastMeal.location_id,
        latitude: pastMeal.latitude,
        longitude: pastMeal.longitude,
        radius: pastMeal.radius,
        budget: pastMeal.budget,
        chosen_restaurant: null,
        liked: null,
        guests: [],
      });
    });
    it("only returns meals associated with the user", async () => {
      const { authToken } = await setUpTest();
      await factories.meal({});

      const result = await request
        .execute(app)
        .get("/meals")
        .set("Authorization", authToken);

      expect(result.body.meals.length).to.eql(2);
    });
    it("only returns the guests that are not the requesting user", async () => {
      const { pastMeal, user, authToken } = await setUpTest();

      const user2 = await factories.user({});
      await factories.guest({ user_id: user2.id, meal_id: pastMeal.id });

      const res = await request
        .execute(app)
        .get("/meals")
        .set("Authorization", authToken);
      const { guests } = res.body.meals[0];

      expect(guests.filter((guest) => guest !== user.name).length).to.eql(
        guests.length,
      );
    });
    describe("when time is not defined", () => {
      it("returns all meals associated with the user", async () => {
        const { authToken } = await setUpTest();

        const res = await request
          .execute(app)
          .get("/meals")
          .set("Authorization", authToken);
        expect(res.body.meals.length).to.eql(2);
      });
    });
    describe("when time is past", () => {
      it("returns only the past meals", async () => {
        const { authToken } = await setUpTest();

        const res = await request
          .execute(app)
          .get("/meals")
          .query({ time: "past" })
          .set("Authorization", authToken);

        expect(res.body.meals.length).to.eql(1);
      });
    });
    describe("when time is future", () => {
      it("returns only the future meals", async () => {
        const { authToken } = await setUpTest();

        const res = await request
          .execute(app)
          .get("/meals")
          .query({ time: "future" })
          .set("Authorization", authToken);

        expect(res.body.meals.length).to.eql(1);
      });
    });
  });
});
