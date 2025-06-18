
import puppeteer from "puppeteer";

class Automate {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        this.page = await this.browser.newPage();

        //Bloqueia recursos desnecessários
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {
            const resourceType = request.resourceType();
            if (['image', 'font'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }

    async login(url, username, password) {

        await this.page.goto(url);

        await this.page.type('#Input_UserName', username);
        await this.page.type('#Input_Password', password);

        await Promise.all([
            this.page.click('#account > div.text-center > button'),
            this.page.waitForNavigation({ timeout: 60000 }),
        ]);
    }

    async readLastTime() {
        const selector = 'body > main > div.container-fluid.py-4 > div:nth-child(6) > div.col-lg-10.col-md-5 > div > div.card-header.p-3.pb-0 > h6 > small';
        await this.page.waitForSelector(selector, { visible: true });
        const text = await this.page.$eval(selector, el => el.textContent.trim());
        return text;
    }

    async close() {
        await this.browser.close();
    }
}

export default Automate;