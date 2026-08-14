import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.fill('input[type=email]', 'admin@gmail.com');
await p.fill('input[type=password]', 'admin@123!');
await p.keyboard.press('Enter');
await p.waitForTimeout(3000);
// go to Accounts
await p.getByText('Accounts', { exact: false }).first().click();
await p.waitForTimeout(2000);
// reveal first password
const eye = p.locator('.icon-btn').first();
if (await eye.count()) { await eye.click(); await p.waitForTimeout(400); }
await p.screenshot({ path: 'shot-accounts.png' });
await b.close();
console.log('done');
