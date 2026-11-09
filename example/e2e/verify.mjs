// Drives the example in real Chromium over SSR and resume.
//
//   npm run e2e              # starts the dev server (port 5351) and checks it
//   npm run e2e -- preview   # checks the preview build (port 5352); run `npm run build.client && npm run build.preview` first
//
// Set CHROMIUM_PATH to use another Chromium.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const mode = process.argv[2] ?? 'dev'
const port = mode === 'preview' ? 5352 : 5351
const origin = `http://127.0.0.1:${port}`
const viteArgs = mode === 'preview' ? ['preview'] : ['--mode', 'ssr']
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'

let serverOutput = ''
const server = spawn('npx', ['vite', ...viteArgs, '--port', String(port), '--strictPort'], { detached: true })
server.stdout.on('data', (chunk) => (serverOutput += chunk))
server.stderr.on('data', (chunk) => (serverOutput += chunk))

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${origin} did not start:\n${serverOutput}`)
}

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (error) {
    results.push(['FAIL', name, error.message.split('\n')[0]])
  }
}

const providerError = (component, slot, recipe) =>
  `Component "${component}" (slot: "${slot}") cannot access createSlotRecipeContext("${recipe}") because it's missing its Provider.`

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

  const newPage = async (path) => {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    await page.goto(origin + path, { waitUntil: 'networkidle' })
    const attr = (id, name = 'class') => page.getAttribute(`#${id}`, name)
    const text = (id) => page.textContent(`#${id}`)
    const style = (id, prop) => page.$eval(`#${id}`, (el, p) => getComputedStyle(el)[p], prop)
    const waitAttr = (selector, value, name = 'class') =>
      page
        .waitForFunction(([s, n, v]) => document.querySelector(s)?.getAttribute(n) === v, [selector, name, value], { timeout: 5000 })
        .catch(async () => assert.equal(await page.getAttribute(selector, name), value, `${selector} ${name}`))
    return { page, errors, attr, text, style, waitAttr }
  }

  // `/`: every Qwik JSX feature with jsxStyleProps 'all'
  const { page, errors, attr, text, style, waitAttr } = await newPage('/')

  await check('style props on styled.button generate CSS', async () => {
    assert.equal(await style('inc', 'backgroundColor'), 'oklch(0.623 0.214 259.815)')
    assert.equal(await style('inc', 'color'), 'rgb(255, 255, 255)')
  })
  await check('css() and pattern components generate CSS', async () => {
    assert.equal(await page.$eval('main > div', (el) => getComputedStyle(el).display), 'flex')
  })
  await check('slot classes on every part (SSR)', async () => {
    assert.equal(await attr('card'), 'mt_2 card__root card__root--size_md')
    assert.equal(await attr('title'), 'card__title card__title--size_md')
    assert.equal(await attr('child-title'), 'card__title card__title--size_md')
    assert.equal(await attr('body'), 'c_pink.700 card__body card__body--size_md')
    assert.equal(await attr('title', 'data-slot'), 'title')
    assert.equal(await style('title', 'fontWeight'), '700')
  })
  await check('unstyled drops slot styles', async () => assert.equal(await attr('unstyled'), ''))
  await check('defaultProps JSX children', async () => assert.equal((await text('default-title')).trim(), 'Default title'))
  await check('forwardProps passes a style prop through to the component', async () => {
    assert.equal(await attr('link', 'data-color'), 'tomato')
  })
  await check('shouldForwardProp keeps forwarded attrs and styles the rest', async () => {
    assert.equal(await attr('fancy-p', 'title'), 'kept')
    assert.equal(await attr('fancy-p', 'aria-label'), 'kept')
    assert.equal(await attr('fancy-p'), 'c_green.700 card__body card__body--size_md')
  })
  await check('withRootProvider provides slots without styling the root', async () => {
    assert.equal(await attr('root-provider'), null)
    assert.equal(await attr('root-title'), 'card__title card__title--size_lg')
  })
  await check('the `id` option keeps two contexts of one recipe apart', async () => {
    assert.equal(await attr('menu-card'), 'card__root card__root--size_md')
    assert.equal(await attr('menu-title'), 'card__title card__title--size_lg')
  })
  await check('sva (anonymous) slot context', async () => {
    assert.equal(await attr('alert'), 'd_flex gap_2 bd-w_1px bd-c_orange.400')
    assert.equal(await attr('alert-icon'), 'c_orange.600')
  })
  await check('createRecipeContext with dataAttr', async () => {
    assert.equal(await attr('badge'), 'badge badge--tone_info')
    assert.equal(await attr('badge', 'data-recipe'), 'badge')
  })
  await check('PropsProvider and usePropsContext (SSR)', async () => {
    assert.equal(await attr('ctx-card'), 'card__root card__root--size_md')
    assert.equal(await text('props-reader'), 'md')
  })
  await check('plain function part and a default Qwik cannot serialize (SSR)', async () => {
    assert.equal(await page.$eval('#note', (el) => el.tagName), 'ASIDE')
    assert.equal(await attr('note'), 'card__body card__body--size_md')
    assert.equal(await page.locator('#glyph [data-testid=glyph]').count(), 1)
  })

  await check('styled.button onClick$ fires after resume', async () => {
    await page.click('#inc')
    await page.locator('#inc', { hasText: 'Clicked 1 times' }).waitFor({ timeout: 5000 })
  })
  await check('variant change recomputes classes on provider and consumers after resume', async () => {
    await waitAttr('#card', 'mt_2 card__root card__root--size_lg')
    await waitAttr('#title', 'card__title card__title--size_lg')
    await waitAttr('#child-title', 'card__title card__title--size_lg')
    await waitAttr('#body', 'c_pink.700 card__body card__body--size_lg')
    assert.equal(await attr('unstyled'), '')
  })
  await check('cva variant after resume', async () => waitAttr('#fancy', 'fw_bold c_blue.600 fancy'))
  await check('sva variant change after resume', async () => waitAttr('#alert', 'd_flex gap_2 bd-w_1px bd-c_green.400'))

  // These parts render in child components that don't re-render: only the PropsProvider value changes.
  await check('PropsProvider change re-renders slot hosts, plain function parts and unserializable defaults', async () => {
    await page.click('#ctx-size')
    await waitAttr('#ctx-card', 'card__root card__root--size_lg')
    await waitAttr('#ctx-title', 'card__title card__title--size_lg')
    await waitAttr('#note', 'card__body card__body--size_lg')
    await waitAttr('#glyph', 'card__title card__title--size_lg')
    assert.equal(await page.locator('#glyph [data-testid=glyph]').count(), 1)
    await page.locator('#props-reader', { hasText: 'lg' }).waitFor({ timeout: 5000 })
  })
  await check('PropsProvider change re-renders createRecipeContext parts, keeping shouldForwardProp', async () => {
    await page.click('#tone')
    await waitAttr('#badge', 'badge badge--tone_danger')
    await waitAttr('#tag', 'badge badge--tone_danger')
    assert.equal(await attr('tag', 'color'), 'tomato')
  })
  await check('no page errors on /', async () => assert.deepEqual(errors, []))

  await check('missing provider error names the recipe and slot (client render)', async () => {
    await page.click('#orphan')
    for (let i = 0; i < 20 && !errors.some((e) => e.includes(providerError('h2', 'title', 'card'))); i++) await page.waitForTimeout(250)
    assert.ok(errors.some((e) => e.includes(providerError('h2', 'title', 'card'))), JSON.stringify(errors))
  })
  await page.close()

  // `/minimal/` and `/none/`: sva slot styles under the other jsxStyleProps modes
  const modePages = {
    '/minimal/': (step) => ({
      '#count': `bg_blue.${step % 2 === 0 ? 500 : 700}`,
      '#panel': 'p_4 mt_4',
      '#panel h2': `fw_bold fs_${step % 2 === 0 ? 'md' : 'lg'} c_red.500`,
      '#provided-panel': 'p_4 mt_2',
      '#provided-panel h2': `fw_bold fs_${step % 2 === 0 ? 'md' : 'lg'} c_red.500`,
    }),
    '/none/': (step) => ({
      '#count': `bg_blue.${step % 2 === 0 ? 500 : 700}`,
      '#panel': 'p_4 panel',
      '#panel h2': `fw_bold fs_${step % 2 === 0 ? 'md' : 'lg'} title`,
      '#provided-panel': 'p_4 provided',
      '#provided-panel h2': `fw_bold fs_${step % 2 === 0 ? 'md' : 'lg'} title`,
    }),
  }
  for (const [path, classes] of Object.entries(modePages)) {
    await check(`jsxStyleProps ${path.slice(1, -1)}: slot styles before and after resume`, async () => {
      const { page, errors, waitAttr } = await newPage(path)
      for (let step = 0; step < 3; step++) {
        if (step > 0) {
          await page.click('#count')
          await page.locator('#count', { hasText: `Clicked ${step} times` }).waitFor({ timeout: 5000 })
        }
        for (const [selector, value] of Object.entries(classes(step))) await waitAttr(selector, value)
      }
      assert.deepEqual(errors, [])
      await page.close()
    })
  }

  await check('missing provider error during SSR', async () => {
    const response = await fetch(`${origin}/orphan/`)
    const body = await response.text()
    const message = providerError('h2', 'title', 'card')
    assert.ok(response.status >= 500, `status ${response.status}`)
    const unescaped = body.replaceAll('\\"', '"').replaceAll('&quot;', '"')
    // production builds answer with a generic page and log the error
    for (let i = 0; i < 20 && !serverOutput.includes(message); i++) await new Promise((resolve) => setTimeout(resolve, 100))
    assert.ok(unescaped.includes(message) || serverOutput.includes(message), 'error message not in the response or the server log')
    assert.equal((await fetch(origin)).status, 200, 'server still serves after the error')
  })

  // `/duplicate/` builds a second context for `card` without an `id`
  await check(`duplicate context warning (${mode === 'dev' ? 'logged in dev' : 'silent in production'})`, async () => {
    const { page, errors, attr } = await newPage('/duplicate/')
    assert.equal(await attr('duplicate'), 'card__root card__root--size_md')
    assert.deepEqual(errors, [])
    const warned = serverOutput.includes('createSlotRecipeContext("card") was called twice for the same recipe without an `id`')
    assert.equal(warned, mode === 'dev', serverOutput.slice(-2000))
    await page.close()
  })
} finally {
  await browser?.close()
  try {
    process.kill(-server.pid)
  } catch {}
}

for (const [status, name, detail] of results) console.log(`${status} ${name}${detail ? `: ${detail}` : ''}`)
console.log(`e2e (${mode}): ${results.filter(([s]) => s === 'PASS').length}/${results.length} passed`)
process.exit(results.some(([status]) => status === 'FAIL') ? 1 : 0)
