/** @jsxImportSource @qwik.dev/core */
import { Slot, component$, type JSXOutput, type PropsOf } from '@qwik.dev/core'
import { ssrRenderToDom } from '@qwik.dev/core/testing'
import { describe, expect, test, vi } from 'vitest'
import { sva } from './styled-system/css'
import { createRecipeContext, createSlotRecipeContext } from './styled-system/jsx'
import { buttonWithCompoundVariants, slotButton } from './styled-system/recipes'

const render = async (node: JSXOutput) => (await ssrRenderToDom(node, { qwikLoader: true })).document

const { withProvider, withContext, withRootProvider } = createSlotRecipeContext(slotButton)

const Root = withProvider('div', 'root')
const Icon = withProvider('span', 'icon')
const Label = withContext('span', 'root')

describe('slot recipe context - qwik', () => {
  test('context slots inherit the root variant, a nested provider slot does not', async () => {
    const document = await render(
      <Root visual="outline">
        <Icon>Icon</Icon>
        <Label>Click me</Label>
      </Root>,
    )

    expect(document.querySelector('div')?.className).toBe('slot-button__root slot-button__root--visual_outline')
    expect(document.querySelector('div')?.getAttribute('data-slot')).toBe('root')
    expect(document.querySelector('[data-slot=icon]')?.className).toBe(
      'slot-button__icon slot-button__icon--visual_unstyled',
    )
    expect(document.querySelector('span[data-slot=root]')?.className).toBe(
      'slot-button__root slot-button__root--visual_outline',
    )
    expect(document.querySelector('span[data-slot=root]')?.textContent).toBe('Click me')
  })

  test('user class, style props and unstyled', async () => {
    const document = await render(
      <Root visual="solid" class="custom" mx="2">
        <Label unstyled class="bare" data-testid="label">
          Click me
        </Label>
      </Root>,
    )

    expect(document.querySelector('div')?.className).toBe(
      'mx_2 slot-button__root slot-button__root--visual_solid custom',
    )
    expect(document.querySelector('[data-testid=label]')?.className).toBe('bare')
  })

  test('defaultProps, including children, land on the rendered element', async () => {
    const RootWithDefaults = withProvider('div', 'root', { defaultProps: { 'data-testid': 'button-root' } })
    const IconWithDefault = withContext('span', 'icon', {
      defaultProps: { class: 'fallback', children: <svg data-testid="default-icon" /> },
    })

    const document = await render(
      <RootWithDefaults visual="solid">
        <IconWithDefault />
      </RootWithDefaults>,
    )

    expect(document.querySelector('div')?.getAttribute('data-testid')).toBe('button-root')
    expect(document.querySelector('[data-slot=icon]')?.className).toBe(
      'slot-button__icon slot-button__icon--visual_solid fallback',
    )
    expect(document.querySelector('[data-testid=default-icon]')).toBeTruthy()
  })

  test('forwardProps exposes the variant to the component', async () => {
    const RootWithForward = withProvider('div', 'root', { forwardProps: ['visual'] })
    const div = (await render(<RootWithForward visual="outline" />)).querySelector('div')!

    expect(div.className).toBe('slot-button__root slot-button__root--visual_outline')
    expect(div.getAttribute('visual')).toBe('outline')
  })

  test('wraps component$ parts', async () => {
    const Part = component$<PropsOf<'button'>>((props) => (
      <button {...props}>
        <Slot />
      </button>
    ))
    const ButtonPart = withContext(Part, 'icon')

    const document = await render(
      <Root>
        <ButtonPart data-testid="part">Click me</ButtonPart>
      </Root>,
    )
    const part = document.querySelector('[data-testid=part]')!

    expect(part.tagName).toBe('BUTTON')
    expect(part.className).toBe('slot-button__icon slot-button__icon--visual_unstyled')
    expect(part.textContent).toBe('Click me')
  })

  test('withRootProvider renders no styled element', async () => {
    const BareRoot = withRootProvider('section')

    const document = await render(
      <BareRoot visual="solid">
        <Label>Click me</Label>
      </BareRoot>,
    )

    expect(document.querySelector('section')?.className).toBe('')
    expect(document.querySelector('span')?.className).toBe('slot-button__root slot-button__root--visual_solid')
  })

  test('an sva recipe adds its slot class to each part', async () => {
    const card = sva({ className: 'card', slots: ['root', 'title'], base: { title: { fontWeight: 'bold' } } })
    const { withProvider: withCardProvider, withContext: withCardContext } = createSlotRecipeContext(card)
    const CardRoot = withCardProvider('div', 'root')
    const CardTitle = withCardContext('h2', 'title')

    const document = await render(
      <CardRoot>
        <CardTitle>Title</CardTitle>
      </CardRoot>,
    )

    expect(document.querySelector('div')?.className).toBe('card__root')
    expect(document.querySelector('h2')?.className).toBe('fw_bold card__title')
  })

  test('a context slot without its provider throws', async () => {
    await expect(render(<Label>Orphan</Label>)).rejects.toThrow(
      'Component "span" (slot: "root") cannot access createSlotRecipeContext("slotButton") because it\'s missing its Provider.',
    )
  })
})

describe('slot recipe context parts and options', () => {
  test('wraps plain function components', async () => {
    const Emphasis = (props: PropsOf<'em'>) => <em {...props} />
    const Part = withContext(Emphasis, 'icon')

    const document = await render(
      <Root visual="solid">
        <Part data-testid="part">Inline</Part>
      </Root>,
    )
    const part = document.querySelector('[data-testid=part]')!

    expect(part.tagName).toBe('EM')
    expect(part.className).toBe('slot-button__icon slot-button__icon--visual_solid')
    expect(part.textContent).toBe('Inline')
  })

  test('defaultProps can hold values Qwik cannot serialize', async () => {
    const Glyph = () => <svg data-testid="glyph" />
    const IconWithGlyph = withContext('span', 'icon', { defaultProps: { children: <Glyph /> } })

    const document = await render(
      <Root>
        <IconWithGlyph />
      </Root>,
    )

    expect(document.querySelector('[data-slot=icon] [data-testid=glyph]')).toBeTruthy()
  })

  test('shouldForwardProp applies to context parts', async () => {
    const Swatch = withContext('span', 'icon', { shouldForwardProp: (prop) => prop === 'color' })
    const swatch = (
      await render(
        <Root>
          <Swatch color="red" bg="blue.500" />
        </Root>,
      )
    ).querySelector('[data-slot=icon]')!

    expect(swatch.getAttribute('color')).toBe('red')
    expect(swatch.className).toBe('bg_blue.500 slot-button__icon slot-button__icon--visual_unstyled')
  })

  test('each id gets its own context', async () => {
    const menu = createSlotRecipeContext(slotButton, { id: 'menu' })
    const MenuLabel = menu.withContext('span', 'root')

    await expect(
      render(
        <Root>
          <MenuLabel>Menu</MenuLabel>
        </Root>,
      ),
    ).rejects.toThrow('cannot access createSlotRecipeContext("slotButton") because it\'s missing its Provider.')
  })

  test('a second context for the same recipe without an id warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createSlotRecipeContext(slotButton)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('createSlotRecipeContext("slotButton") was called twice'))
    warn.mockRestore()
  })
})

describe('slot recipe context PropsProvider', () => {
  test('PropsProvider sets variants and props on withProvider', async () => {
    const { withProvider, withContext, PropsProvider } = createSlotRecipeContext(slotButton, { id: 'props-a' })
    const ButtonRoot = withProvider('div', 'root')
    const ButtonLabel = withContext('span', 'root')

    const document = await render(
      <PropsProvider value={{ visual: 'solid', 'data-testid': 'button' }}>
        <ButtonRoot>
          <ButtonLabel>Click me</ButtonLabel>
        </ButtonRoot>
      </PropsProvider>,
    )

    expect(document.querySelector('div')?.className).toBe('slot-button__root slot-button__root--visual_solid')
    expect(document.querySelector('div')?.getAttribute('data-testid')).toBe('button')
    expect(document.querySelector('span')?.className).toBe('slot-button__root slot-button__root--visual_solid')
  })

  test('passed props override PropsProvider', async () => {
    const { withProvider, PropsProvider } = createSlotRecipeContext(slotButton, { id: 'props-b' })
    const ButtonRoot = withProvider('div', 'root')

    const document = await render(
      <PropsProvider value={{ visual: 'solid' }}>
        <ButtonRoot visual="outline">Click me</ButtonRoot>
      </PropsProvider>,
    )

    expect(document.querySelector('div')?.className).toBe('slot-button__root slot-button__root--visual_outline')
  })

  test('PropsProvider sets variants on withRootProvider', async () => {
    const { withRootProvider, withContext, PropsProvider } = createSlotRecipeContext(slotButton, { id: 'props-c' })
    const ButtonRoot = withRootProvider('div')
    const ButtonLabel = withContext('span', 'root')

    const document = await render(
      <PropsProvider value={{ visual: 'solid' }}>
        <ButtonRoot>
          <ButtonLabel>Click me</ButtonLabel>
        </ButtonRoot>
      </PropsProvider>,
    )

    expect(document.querySelector('span')?.className).toBe('slot-button__root slot-button__root--visual_solid')
  })
})

// Module scope: a component$ may only capture top-level bindings.
const buttonContext = createRecipeContext(buttonWithCompoundVariants)
const Button = buttonContext.withContext('button')
const { PropsProvider } = buttonContext

describe('recipe context - qwik', () => {
  test('withContext applies the recipe', async () => {
    const button = (await render(<Button visual="solid">Click me</Button>)).querySelector('button')!

    expect(button.className).toBe('button button--visual_solid button--compound__visual_solid')
    expect(button.textContent).toBe('Click me')
  })

  test('an undefined prop keeps the value from PropsProvider', async () => {
    const document = await render(
      <PropsProvider value={{ visual: 'solid', 'data-testid': 'close' }}>
        <Button visual={undefined} data-testid={undefined}>
          Close
        </Button>
      </PropsProvider>,
    )
    const button = document.querySelector('button')!

    expect(button.className).toBe('button button--visual_solid button--compound__visual_solid')
    expect(button.getAttribute('data-testid')).toBe('close')
  })

  test('usePropsContext reads the PropsProvider value inside component$', async () => {
    const Visual = component$(() => <output>{buttonContext.usePropsContext()?.visual ?? 'none'}</output>)

    const document = await render(
      <>
        <PropsProvider value={{ visual: 'outline' }}>
          <Visual />
        </PropsProvider>
        <Visual />
      </>,
    )

    expect(Array.from(document.querySelectorAll('output'), (el) => el.textContent)).toEqual(['outline', 'none'])
  })

  test('defaultProps sit under PropsProvider and passed props', async () => {
    const Close = buttonContext.withContext('button', { defaultProps: { 'data-testid': 'default', children: 'Close' } })

    const document = await render(
      <PropsProvider value={{ visual: 'solid', 'data-testid': 'context' }}>
        <Close size="sm" />
      </PropsProvider>,
    )
    const button = document.querySelector('button')!

    expect(button.className).toBe('button button--visual_solid button--size_sm button--compound__visual_solid')
    expect(button.getAttribute('data-testid')).toBe('context')
    expect(button.textContent).toBe('Close')
  })
})
