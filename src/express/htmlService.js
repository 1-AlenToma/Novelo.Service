const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');


const imageFileTypes = ".jpeg .jpg .gif .png .webp".split(" ").filter(x => x.length > 0);
const isImageFile = (url) => {
    const ext = path.extname(url).toLowerCase();
    return imageFileTypes.includes(ext);
}
const getCacheDir = () => {
    const cacheDir = path.join(__dirname, 'htmlCache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}

const stripUrlPath = (url, isImage) => {
    try {
        const parsedUrl = new URL(url);
        return {
            isImage,
            url: parsedUrl.hostname,
            fileName: (isImage ? "png_" : "") + parsedUrl.pathname.replace(/[^a-z0-9]/gi, '_').toLowerCase(), // Replace non-alphanumeric characters for file naming
            folderName: parsedUrl.hostname.replace(/\./g, '_').toLowerCase() // Replace dots with underscores for folder naming
        }
    } catch (err) {
        console.error('Invalid URL:', url);
        return url; // Return original if invalid
    }
}

const cacheHtml = (stripedUrl, html) => {
    try {
        const folderPath = path.join(getCacheDir(), stripedUrl.folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filePath = path.join(folderPath, `${stripedUrl.fileName}.html`);
        fs.writeFileSync(filePath, `${new Date().toISOString()}\n${html}`);
    } catch (err) {
        console.error('Error caching HTML:', err);
    }
}

const getCachedFile = (stripedUrl) => {
    try {
        const p = path.join(getCacheDir(), stripedUrl.folderName, `${stripedUrl.fileName}.html`);
        if (fs.existsSync(p)) {
            let html = fs.readFileSync(p, 'utf-8');
            const d = new Date(html.split('\n')[0]);
            const now = new Date();
            const diff = (now - d) / (1000 * 60 * 60);
            return { html: html.split('\n').slice(1).join('\n'), path: p, old: !stripedUrl.isImage ? diff >= 24 : false }; // Return the HTML content, file path, and age in hours
        }
        return undefined;
    } catch (err) {
        console.error('Error checking path existence:', err);
        return undefined;
    }
}

const getImage = async (page) => {
    try {
        // 1. Grab the image source attribute
        const imageUrl = await page.locator('img').getAttribute('src');
        console.log("Attempting to scrape image from page:", imageUrl);
        // 2. Form a complete URL if the path is relative
        const absoluteUrl = new URL(imageUrl, page.url()).href;

        // 3. Fetch the asset using the browser's current cookies/session
        const response = await page.request.get(absoluteUrl);
        const imageBuffer = await response.body();

        // 4. Convert the raw binary buffer directly into a Base64 string in Node.js
        const cleanBase64 = imageBuffer.toString('base64');

        // Optional: Format it as a standard data URI string if your application expects it
        const contentType = response.headers()['content-type'] || 'image/jpeg';
        const formattedBase64Url = `data:${contentType};base64,${cleanBase64}`;

        return `
        <!DOCTYPE html><html lang="en" dir="ltr"><head><script src="https://connect.facebook.net/signals/config/780279355814318?v=2.9.438&amp;r=stable&amp;domain=www.webnovel.com&amp;hme=4453c87d489b6902031c012cadd2731893cd69feb64fe8a61b339727247a7703&amp;ex_m=118%2C242%2C171%2C27%2C82%2C83%2C162%2C78%2C77%2C11%2C181%2C102%2C20%2C153%2C141%2C46%2C85%2C90%2C149%2C176%2C183%2C8%2C4%2C5%2C7%2C6%2C3%2C103%2C115%2C161%2C72%2C185%2C110%2C184%2C211%2C263%2C37%2C84%2C283%2C282%2C281%2C14%2C25%2C28%2C40%2C62%2C117%2C68%2C10%2C73%2C111%2C112%2C113%2C119%2C144%2C38%2C36%2C146%2C147%2C148%2C143%2C142%2C172%2C86%2C175%2C173%2C174%2C57%2C69%2C67%2C137%2C19%2C179%2C52%2C333%2C334%2C335%2C332%2C32%2C17%2C31%2C18%2C33%2C34%2C35%2C55%2C163%2C87%2C126%2C22%2C24%2C51%2C47%2C49%2C48%2C95%2C104%2C108%2C124%2C160%2C164%2C53%2C125%2C29%2C26%2C133%2C79%2C43%2C166%2C165%2C167%2C157%2C155%2C30%2C42%2C66%2C123%2C178%2C80%2C21%2C128%2C93%2C76%2C23%2C97%2C98%2C130%2C96%2C151%2C150%2C154%2C109%2C177%2C180%2C41%2C349%2C371%2C256%2C238%2C70%2C239%2C237%2C374%2C365%2C59%2C257%2C121%2C145%2C92%2C135%2C61%2C54%2C56%2C127%2C134%2C140%2C139%2C65%2C74%2C168%2C88%2C89%2C129%2C44%2C39%2C60%2C63%2C114%2C182%2C1%2C138%2C16%2C136%2C12%2C2%2C64%2C105%2C15%2C75%2C71%2C132%2C101%2C100%2C187%2C188%2C106%2C107%2C9%2C116%2C186%2C58%2C158%2C99%2C91%2C81%2C131%2C120%2C169%2C50%2C159%2C0%2C94%2C152%2C156%2C170%2C45%2C122%2C13%2C189" async=""></script><script async="" src="https://connect.facebook.net/en_US/fbevents.js"></script><script type="text/javascript" async="" src="https://www.google-analytics.com/analytics.js"></script>
        <html><body><img src="${formattedBase64Url}" alt="Scraped Image" /></body></html>`;
    } catch (err) {
        console.error('Error fetching image:', err);
    }

}

const loadChromium = (app) => {
    chromium.use(stealth);
    app.get('/scrape-free', async (req, res) => {
        const targetUrl = req.query.url;
        const cache = req.query.cache || false;
        const isImage = isImageFile(targetUrl) || req.query.isImage || false;
        const stripedUrl = stripUrlPath(targetUrl, isImage);
        const cachedFile = getCachedFile(stripedUrl);

        if (cache && cachedFile && !cachedFile.old) {
            //console.log(`Serving cached HTML for ${targetUrl} from ${cachedFile.path}`);
            res.setHeader('Content-Type', 'text/html');
            return res.send(cachedFile.html);
        }
        console.log(`Scraping URL: ${targetUrl} | Cache: ${cache}`, "stripUrlPath", stripedUrl, cachedFile ? `Cached file exists: ${cachedFile.path}, old: ${cachedFile.old}` : "No cached file found", `isImage: ${isImage}`);
        // Launch a real, visible browser (headless: false is highly recommended for free bypasses)
        const browser = await chromium.launch({
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        });

        const context = await browser.newContext({
            viewport: { width: 100, height: 100 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

            // 1. Wait a moment for the CAPTCHA iframe to load naturally
            await page.waitForTimeout(3000);

            // 2. Locate the CAPTCHA checkbox frame (This selector targets Cloudflare Turnstile / reCAPTCHA frames)
            const captchaFrame = page.frames().find(f => f.url().includes('cloudflare') || f.url().includes('recaptcha'));

            if (captchaFrame) {
                console.log("CAPTCHA box detected. Attempting natural human click...");

                // Find the checkbox inside the frame and click it
                // Note: Selectors change, but standard text or id target works well
                const checkbox = await captchaFrame.$('[type="checkbox"], #challenge-stage, .recaptcha-checkbox');
                if (checkbox) {
                    // Playwright automatically simulates a realistic human curve/click trajectory
                    await checkbox.click();
                }
            }

            // 3. Wait for the page content to change or reveal your target element
            // Replace '.your-target-data' with the actual data selector you want to scrape
            //await page.waitForSelector('.your-target-data', { timeout: 15000 });

            const html = isImage ? await getImage(page) : await page.content();
            await browser.close();

            // Cache the scraped HTML
            if (cache) {
                cacheHtml(stripedUrl, html);
            }

            res.setHeader('Content-Type', 'text/html');
            return res.send(html);

        } catch (err) {
            await browser.close();
            if (cache && cachedFile) {
                console.log(`Serving cached HTML for ${targetUrl} from ${cachedFile.path}`);
                res.setHeader('Content-Type', 'text/html');
                return res.send(cachedFile.html);
            } else
                return res.status(500).json({ error: `Bypass failed: ${err.message}` });
        }
    });
}

module.exports = { loadChromium };