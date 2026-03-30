import { expect } from "chai";
import * as factories from "../../models/factories/index.js";
import Meal from "../../models/meals.js";
import User from "../../models/users.js";
import Guest from "../../models/guests.js";
import {
  meal_guests_get,
  meal_guest_add,
  meal_guest_get_round,
  meal_guest_update_round,
  meal_guests_delete,
  leave_meal,
} from "../guestsController.js";

if (!Guest.associations.user) {
  Guest.belongsTo(User, { foreignKey: "user_id" });
}

function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("Guests Controller", () => {
  afterEach(async () => {
    await Meal.destroy({ truncate: { cascade: true } });
    await User.destroy({ truncate: { cascade: true } });
  });

  describe("meal_guests_get", () => {
    it("returns other guests for a meal", async () => {
      const otherUser = await factories.user({});
      const originalFindAll = Guest.findAll;
      Guest.findAll = async () => [
        {
          user_id: otherUser.id,
          role: "guest",
          user: { name: otherUser.name, username: otherUser.username },
        },
      ];

      const req = {
        params: { mealId: 1 },
        decoded: { guest_id: 2 },
      };
      const res = createRes();

      await meal_guests_get(req, res, () => {});
      Guest.findAll = originalFindAll;

      expect(res.statusCode).to.equal(200);
      expect(res.body.guests).to.have.length(1);
      expect(res.body.guests[0]).to.include({
        user_id: otherUser.id,
        role: "guest",
      });
    });
  });

  describe("meal_guest_add", () => {
    it("adds a new guest", async () => {
      const meal = await factories.meal({});
      const user = await factories.user({});
      const req = {
        params: { mealId: meal.id },
        body: { user_id: user.id, role: "guest" },
      };
      const res = createRes();

      await meal_guest_add(req, res, () => {});

      const row = await Guest.findOne({
        where: { meal_id: meal.id, user_id: user.id },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal("Successfully added guest");
      expect(row).to.exist;
    });

    it("returns 401 when guest already exists", async () => {
      const meal = await factories.meal({});
      const user = await factories.user({});
      await factories.guest({ meal_id: meal.id, user_id: user.id, role: "guest" });

      const req = {
        params: { mealId: meal.id },
        body: { user_id: user.id, role: "guest" },
      };
      const res = createRes();

      await meal_guest_add(req, res, () => {});

      expect(res.statusCode).to.equal(401);
      expect(res.body.error).to.equal("Guest already in meal");
    });
  });

  describe("meal_guest_get_round", () => {
    it("returns the guest round", async () => {
      const meal = await factories.meal({});
      const user = await factories.user({});
      const guest = await factories.guest({
        meal_id: meal.id,
        user_id: user.id,
        role: "guest",
      });
      await Guest.update({ round: 2 }, { where: { id: guest.id } });

      const req = { decoded: { guest_id: guest.id } };
      const res = createRes();

      await meal_guest_get_round(req, res, () => {});

      expect(res.statusCode).to.equal(200);
      expect(res.body.round).to.equal(2);
    });
  });

  describe("meal_guest_update_round", () => {
    it("updates and returns the guest round", async () => {
      const meal = await factories.meal({});
      const user = await factories.user({});
      const guest = await factories.guest({
        meal_id: meal.id,
        user_id: user.id,
        role: "guest",
      });

      const req = {
        decoded: { guest_id: guest.id },
        body: { round: 1 },
      };
      const res = createRes();

      await meal_guest_update_round(req, res, () => {});
      const updatedGuest = await Guest.findByPk(guest.id);
      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal("Updated successfully");
      expect(res.body.round).to.equal(1);
      expect(updatedGuest.round).to.equal(1);
    });
  });

  describe("meal_guests_delete", () => {
    it("removes a guest when requester is admin", async () => {
      const meal = await factories.meal({});
      const adminUser = await factories.user({});
      const targetUser = await factories.user({});

      await factories.guest({
        meal_id: meal.id,
        user_id: adminUser.id,
        role: "admin",
      });
      await factories.guest({
        meal_id: meal.id,
        user_id: targetUser.id,
        role: "guest",
      });

      const req = {
        params: { mealId: meal.id, userId: targetUser.id },
        decoded: { role: "admin" },
      };
      const res = createRes();

      await meal_guests_delete(req, res, () => {});

      const deletedRow = await Guest.findOne({
        where: { meal_id: meal.id, user_id: targetUser.id },
      });
      expect(res.statusCode).to.equal(200);
      expect(deletedRow).to.equal(null);
    });
  });

  describe("leave_meal", () => {
    it("removes the requesting user from the meal", async () => {
      const meal = await factories.meal({});
      const user = await factories.user({});
      await factories.guest({
        meal_id: meal.id,
        user_id: user.id,
        role: "guest",
      });

      const req = {
        params: { mealId: meal.id },
        decoded: { user_id: user.id },
      };
      const res = createRes();

      await leave_meal(req, res, () => {});

      const row = await Guest.findOne({
        where: { meal_id: meal.id, user_id: user.id },
      });
      expect(res.statusCode).to.equal(200);
      expect(row).to.equal(null);
    });
  });
});
