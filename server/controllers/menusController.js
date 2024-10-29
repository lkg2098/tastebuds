const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

exports.fetchAndLocateMenu = async (restaurantUrl) => {
  try {
    // Fetch the website HTML
    const { data } = await axios.get(restaurantUrl).catch(async (err) => {
      console.log(err.status);
      if (err.status == 403) {
        try {
          const data = await axios.get(`${restaurantUrl}sitemap.xml`);
        } catch (error) {
          console.error("Error fetching or parsing the website:", error);
        }
      }
    });

    // Load the HTML into cheerio
    const $ = cheerio.load(data);

    // A basic selector to find links that might lead to the menu
    // This is just a starting point; you'll need to adapt it for the specific website
    const potentialMenuLinks = $("a")
      .map((i, el) => $(el).attr("href"))
      .get()
      .filter((href) => href && href.toLowerCase().includes("menu"));

    if (potentialMenuLinks.length === 0) {
      console.log("No potential menu links found.");
      return;
    }

    // // Output the found links
    console.log("Potential menu links found:");
    potentialMenuLinks.forEach((link) => {
      // If the href is a relative path, make it absolute
      const absoluteLink = new URL(link, restaurantUrl).href;
      console.log(absoluteLink);
    });
    console.log(potentialMenuLinks);
  } catch (error) {
    console.error("Error fetching or parsing the website:", error);
  }
};

exports.scrapeMenuPages = async (urls) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Enable request interception
  //   await page.setRequestInterception(true);

  // Intercept requests and block certain resource types
  //   page.on("request", (req) => {
  //     if (
  //       req.resourceType() === "stylesheet" ||
  //       req.resourceType() === "font" ||
  //       req.resourceType() === "image"
  //     ) {
  //       req.abort();
  //     } else {
  //       req.continue();
  //     }
  //   });
  const output = {};
  try {
    for (let url of urls) {
      await page.goto(url, { waitUntil: "networkidle2" });

      //   await page.screenshot({
      //     path: `./controllers/screenshots/${url
      //       .replace("https://", "")
      //       .replace("http://", "")
      //       .replace(".com/", "")}.png`,
      //   });
      const menuLinks = await page
        .$$eval("a", (links) => {
          return [
            ...links.reduce((prev, link) => {
              if (
                (link.href && link.href.toLowerCase().includes("menu")) ||
                (link.textContent &&
                  link.textContent.toLowerCase().includes("menu"))
              ) {
                prev.add(link.href);
              }
              return prev;
            }, new Set()),
          ];
        })
        .catch((err) => {
          console.error(`Error fetching or parsing the website ${url}:`, err);
        });

      //   const menuLinks = await page.evaluate(() => {
      //     const links = Array.from(document.querySelectorAll("a"));
      //     return links
      //       .map((link) => link.href)
      //       .filter((href) => href.toLowerCase().includes("menu"));
      //   });
      if (menuLinks) {
        output[url] = menuLinks;
      }
      console.log(output);
    }
    return output;
  } catch (error) {
    console.error(`Error fetching or parsing the websites:`, error);
  } finally {
    await browser.close();
  }
};
