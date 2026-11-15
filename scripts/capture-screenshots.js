import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../results/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 1. Capture Login Page
    console.log('1. Capturing 01-login.png...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-login.png') });

    // 2. Login as Admin
    console.log('Logging in as Admin...');
    await page.type('input[type="email"]', 'admin@smartconnect.com');
    await page.type('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(2500);

    // 3. Ensure Light Mode for Dashboard
    console.log('2. Capturing 02-dashboard-light.png...');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard-light.png') });

    // 4. Capture Dashboard Dark Mode
    console.log('3. Capturing 03-dashboard-dark.png...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '03-dashboard-dark.png') });

    // 5. Leads Kanban Dark Mode
    console.log('7. Capturing 07-leads-kanban-dark.png...');
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '07-leads-kanban-dark.png') });

    // 6. Switch back to Light Mode for Leads Kanban
    console.log('6. Capturing 06-leads-kanban-light.png...');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '06-leads-kanban-light.png') });

    // 7. Click on a Lead Card to open Lead Drawer
    console.log('8. Capturing 08-lead-drawer.png...');
    await page.evaluate(() => {
      const cards = document.querySelectorAll('div[data-sortable-id], div[draggable]');
      if (cards.length > 0) {
        cards[0].click();
      } else {
        const textNodes = document.querySelectorAll('h4, .font-medium, .cursor-pointer');
        for (const el of textNodes) {
          if (el.textContent && el.textContent.length > 3) {
            el.click();
            break;
          }
        }
      }
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '08-lead-drawer.png') });

    // 8. Customers List Page
    console.log('4. Capturing 04-customers-list.png...');
    await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-customers-list.png') });

    // 9. Customer 360 Page
    console.log('5. Capturing 05-customer-360.png...');
    await page.goto(`${BASE_URL}/customers/contact/d67baf66-1fae-4ec2-bb7f-26e031fe6070`, {
      waitUntil: 'networkidle0',
    });
    await sleep(2500);
    await page.screenshot({ path: path.join(screenshotsDir, '05-customer-360.png') });

    // 10. Follow-ups List
    console.log('9. Capturing 09-followups-list.png...');
    await page.goto(`${BASE_URL}/follow-ups`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '09-followups-list.png') });

    // 11. Follow-ups Calendar
    console.log('10. Capturing 10-followups-calendar.png...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const calendarBtn = buttons.find((b) => b.textContent && b.textContent.includes('Calendar'));
      if (calendarBtn) {
        calendarBtn.click();
      }
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(screenshotsDir, '10-followups-calendar.png') });

    // 12. Activities Stream
    console.log('11. Capturing 11-activities.png...');
    await page.goto(`${BASE_URL}/activities`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '11-activities.png') });

    // 13. Reports Page
    console.log('12. Capturing 12-reports.png...');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' });
    await sleep(2500);
    await page.screenshot({ path: path.join(screenshotsDir, '12-reports.png') });

    // 14. Settings Page (Admin)
    console.log('13. Capturing 13-settings.png...');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '13-settings.png') });

    // 15. Rep View proving restricted access
    console.log('14. Capturing 14-rep-restricted-access.png...');
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.type('input[type="email"]', 'alex.rep@smartconnect.com');
    await page.type('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(2000);

    // Rep navigates to settings showing restricted tabs
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '14-rep-restricted-access.png') });

    console.log('All 14 screenshots successfully captured and saved to results/screenshots!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
