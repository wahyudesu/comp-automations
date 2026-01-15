import { PlaywrightCrawler } from "crawlee";
import { router } from "./ig.js";

const crawler = new PlaywrightCrawler({
    requestHandler: router,
});

await crawler.run([
    "https://www.instagram.com/techfusion.id/",
]);
