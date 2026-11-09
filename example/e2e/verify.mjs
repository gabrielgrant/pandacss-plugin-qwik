// Drives the app in real Chromium over SSR + resume: node e2e/verify.mjs <baseUrl>
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://127.0.0.1:5351'
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))

const results = []
const check = async (name, fn) => {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (error) {
    results.push(['FAIL', name, error.message.split('\n')[0]])
  }
}
const cls = (id) => page.getAttribute(`#${id}`, 'class')
const text = (id) => page.textContent(`#${id}`)
const style = (id, prop) => page.$eval(`#${id}`, (el, p) => getComputedStyle(el)[p], prop)
const waitClass = (id, part) => page.waitForFunction(([i, p]) => document.getElementById(i)?.className.includes(p), [id, part], { timeout: 5000 })

await page.goto(base, { waitUntil: 'networkidle' })

await check('style props on styled.button generate CSS', async () => {
  assert.equal(await style('inc', 'backgroundColor'), 'oklch(0.623 0.214 259.815)')
  assert.equal(await style('inc', 'color'), 'rgb(255, 255, 255)')
})
await check('css() + pattern components generate CSS', async () => {
  assert.equal(await page.$eval('main > div', (el) => getComputedStyle(el).display), 'flex')
})
await check('slot classes on every part (SSR)', async () => {
  assert.equal(await cls('card'), 'mt_2 card__root card__root--size_md')
  assert.equal(await cls('title'), 'card__title card__title--size_md')
  assert.equal(await cls('child-title'), 'card__title card__title--size_md')
  assert.equal(await cls('body'), 'c_pink.700 card__body card__body--size_md')
  assert.equal(await page.getAttribute('#title', 'data-slot'), 'title')
  assert.equal(await style('title', 'fontWeight'), '700')
})
await check('unstyled drops slot styles', async () => assert.equal(await cls('unstyled'), ''))
await check('defaultProps JSX children', async () => assert.equal((await text('default-title')).trim(), 'Default title'))
await check('forwardProps passes a style prop through to the component', async () => {
  assert.equal(await page.getAttribute('#link', 'data-color'), 'tomato')
})
await check('shouldForwardProp keeps forwarded attrs and styles the rest', async () => {
  assert.equal(await page.getAttribute('#fancy-p', 'title'), 'kept')
  assert.equal(await page.getAttribute('#fancy-p', 'aria-label'), 'kept')
  assert.equal(await cls('fancy-p'), 'c_green.700 card__body card__body--size_md')
})
await check('withRootProvider provides slots without styling the root', async () => {
  assert.equal(await cls('root-provider'), null)
  assert.equal(await cls('root-title'), 'card__title card__title--size_lg')
})
await check('sva (anonymous) slot context', async () => {
  assert.equal(await cls('alert'), 'd_flex gap_2 bd-w_1px bd-c_orange.400')
  assert.equal(await cls('alert-icon'), 'c_orange.600')
})
await check('createRecipeContext + dataAttr', async () => {
  assert.equal(await cls('badge'), 'badge badge--tone_info')
  assert.equal(await page.getAttribute('#badge', 'data-recipe'), 'badge')
})
await check('PropsProvider + usePropsContext (SSR)', async () => {
  assert.equal(await cls('ctx-card'), 'card__root card__root--size_md')
  assert.equal(await text('props-reader'), 'md')
})

await check('styled.button onClick$ fires after resume', async () => {
  await page.click('#inc')
  await page.waitForFunction(() => document.getElementById('inc')?.textContent?.includes('Clicked 1 times'), null, { timeout: 5000 })
})
await check('variant change recomputes classes on provider and consumers after resume', async () => {
  await waitClass('card', 'card__root--size_lg')
  await waitClass('title', 'card__title--size_lg')
  await waitClass('child-title', 'card__title--size_lg')
  await waitClass('body', 'card__body--size_lg')
  assert.equal(await cls('unstyled'), '')
})
await check('cva variant + ClassList object class after resume', async () => {
  await waitClass('fancy', 'c_blue.600')
  await waitClass('fancy', 'is-odd')
})
await check('sva variant change after resume', async () => {
  await waitClass('alert', 'bd-c_green.400')
})
await check('PropsProvider value change re-renders the slot provider and consumers after resume', async () => {
  await page.click('#ctx-size')
  await waitClass('ctx-card', 'card__root--size_lg')
  await waitClass('ctx-title', 'card__title--size_lg')
  await page.waitForFunction(() => document.getElementById('props-reader')?.textContent === 'lg', null, { timeout: 5000 })
})
await check('PropsProvider value change re-renders createRecipeContext consumers after resume', async () => {
  await page.click('#tone')
  await waitClass('badge', 'badge--tone_danger')
})
await check('no page errors', async () => assert.deepEqual(errors, []))


const providerError = /Component "h2" \(slot: "title"\) cannot access createSlotRecipeContext\("card"\) because it's missing its Provider\./
await check('missing provider error names the recipe and slot (client render)', async () => {
  await page.click('#orphan')
  await page.waitForFunction(() => document.getElementById('orphan')?.isConnected, null, { timeout: 5000 })
  await page.waitForTimeout(1000)
  const reported = errors.splice(0)
  assert.ok(reported.some((message) => providerError.test(message)), JSON.stringify(reported))
})
await browser.close()
for (const [status, name, detail] of results) console.log(`${status} ${name}${detail ? `: ${detail}` : ''}`)
if (errors.length) console.log('page errors:', errors)
process.exit(results.some(([status]) => status === 'FAIL') ? 1 : 0)
