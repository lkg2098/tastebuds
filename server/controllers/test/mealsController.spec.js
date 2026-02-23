import * as factories from "../../models/factories/index.js";
import Meal from "../../models/meals.js";

describe("Meals Controller", () => {
  beforeEach(async () => {
    await factories.meal({});
  });

  afterEach(async () => {
    await Meal.truncate();
  });

  it("created the meal", async () => {
    console.log(await Meal.findOne());
  });
});
