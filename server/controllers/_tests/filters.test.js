const { filter_by_hours } = require("../googleController");

const SPLIT_HOURS = [
  {
    open: {
      day: 0,
      hour: 13,
      minute: 0,
    },
    close: {
      day: 0,
      hour: 21,
      minute: 0,
    },
  },
  {
    open: {
      day: 2,
      hour: 12,
      minute: 0,
    },
    close: {
      day: 2,
      hour: 15,
      minute: 0,
    },
  },
  {
    open: {
      day: 2,
      hour: 17,
      minute: 0,
    },
    close: {
      day: 2,
      hour: 22,
      minute: 0,
    },
  },
  {
    open: {
      day: 3,
      hour: 12,
      minute: 0,
    },
    close: {
      day: 3,
      hour: 15,
      minute: 0,
    },
  },
  {
    open: {
      day: 3,
      hour: 17,
      minute: 0,
    },
    close: {
      day: 3,
      hour: 22,
      minute: 0,
    },
  },
  {
    open: {
      day: 4,
      hour: 12,
      minute: 0,
    },
    close: {
      day: 4,
      hour: 15,
      minute: 0,
    },
  },
  {
    open: {
      day: 4,
      hour: 17,
      minute: 0,
    },
    close: {
      day: 4,
      hour: 22,
      minute: 0,
    },
  },
  {
    open: {
      day: 5,
      hour: 12,
      minute: 0,
    },
    close: {
      day: 5,
      hour: 15,
      minute: 0,
    },
  },
  {
    open: {
      day: 5,
      hour: 17,
      minute: 0,
    },
    close: {
      day: 5,
      hour: 23,
      minute: 0,
    },
  },
  {
    open: {
      day: 6,
      hour: 12,
      minute: 0,
    },
    close: {
      day: 6,
      hour: 15,
      minute: 0,
    },
  },
  {
    open: {
      day: 6,
      hour: 17,
      minute: 0,
    },
    close: {
      day: 6,
      hour: 23,
      minute: 0,
    },
  },
];

describe("test place filters", () => {
  it("test filter by hours - open 24 hours", () => {
    let result = filter_by_hours(
      [
        {
          open: {
            day: 0,
            hour: 0,
            minute: 0,
          },
        },
      ],
      new Date()
    );
    expect(result).toBe(true);
  });
  it("test filter by hours - never open", () => {
    let result = filter_by_hours([], new Date());
    expect(result).toBe(false);
  });
  it("test filter by hours - one in list", () => {
    let result = filter_by_hours(
      [
        {
          open: {
            day: 0,
            hour: 3,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 0,
            minute: 24,
          },
        },
        {
          open: {
            day: 1,
            hour: 3,
            minute: 0,
          },
          close: {
            day: 2,
            hour: 0,
            minute: 24,
          },
        },
      ],
      new Date("August 25, 2024 18:24:00") // sunday 6:24pm
    );
    expect(result).toBe(true);
  });
  it("test filter by hours - none in list", () => {
    let result = filter_by_hours(
      [
        {
          open: {
            day: 0,
            hour: 3,
            minute: 0,
          },
          close: {
            day: 1,
            hour: 0,
            minute: 24,
          },
        },
        {
          open: {
            day: 1,
            hour: 15,
            minute: 25,
          },
          close: {
            day: 1,
            hour: 23,
            minute: 24,
          },
        },
        {
          open: {
            day: 2,
            hour: 3,
            minute: 0,
          },
          close: {
            day: 3,
            hour: 0,
            minute: 24,
          },
        },
      ],
      new Date("August 26, 2024 15:24:00") // monday 3:24pm
    );
    expect(result).toBe(false);
  });
  it("test split day hours", () => {
    let result = filter_by_hours(
      SPLIT_HOURS,
      new Date("August 23, 2024 15:24:00")
    );
    expect(result).toBe(false);
  });
  it("test split day hours", () => {
    let result = filter_by_hours(
      SPLIT_HOURS,
      new Date("August 23, 2024 17:24:00")
    );
    expect(result).toBe(true);
  });
  it("test closed on monday", () => {
    let result = filter_by_hours(
      SPLIT_HOURS,
      new Date("August 26, 2024 17:24:00")
    );
    expect(result).toBe(false);
  });
});
