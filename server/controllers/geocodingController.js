const axios = require("axios");
const asyncHandler = require("express-async-handler");

exports.autocomplete = asyncHandler(async (req, res, next) => {
  let query = req.query.text;
  let latitude = Number(req.query.latitude);
  let longitude = Number(req.query.longitude);
  if (query) {
    const encodedQuery = encodeURIComponent(query);
    console.log(encodeURIComponent(query));
    console.log(
      `${latitude - 1},${longitude - 1},${latitude + 1},${longitude + 1}`
    );
    const { data } = await axios.get(
      `https://us1.locationiq.com/v1/autocomplete?key=${
        process.env.LOCATION_IQ_TOKEN
      }&q=${encodedQuery}&normalizecity=1&viewbox='${latitude - 1},${
        longitude - 1
      },${latitude + 1},${longitude + 1}'`
    );

    console.log(data);
    let results = data.map((loc) => {
      let address = "";
      if (loc.address.house_number) {
        address += loc.address.house_number + " ";
      }
      if (loc.address.road) {
        address += loc.address.road + " ";
      }
      if (loc.address.name && !address) {
        address += loc.address.name + " ";
      }
      if (loc.address.suburb) {
        address += loc.address.suburb + ", ";
      } else if (loc.address.city) {
        address += loc.address.city + ", ";
      }
      if (loc.address.state) {
        address += loc.address.state;
      } else if (loc.address.country) {
        address += loc.address.country;
      }

      return {
        coords: [loc.lat, loc.lon],
        address: address,
      };
    });
    results.sort((a, b) => {});
    res.status(200).json({
      results,
    });
  } else {
    res.status(401).json({ error: "Invalid query" });
  }
});
