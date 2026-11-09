/** @jsxImportSource @qwik.dev/core */
import { createSignal, type ClassList, type JSXOutput, type Signal } from '@qwik.dev/core'
import { ssrRenderToDom } from '@qwik.dev/core/testing'
import { describe, expect, test } from 'vitest'
import { Box, Stack, styled } from './styled-system/jsx'
import { buttonWithCompoundVariants } from './styled-system/recipes'

const render = async (node: JSXOutput) => (await ssrRenderToDom(node, { qwikLoader: true })).document

const classOf = async (node: JSXOutput, selector: string) => (await render(node)).querySelector(selector)?.className

describe('styled factory with an inline recipe', () => {
  const Button = styled('button', {
    base: {
      color: 'red.500',
      bg: 'blue.500',
      _hover: {
        color: 'red.600',
        bg: 'blue.600',
      },
    },
    variants: {
      size: {
        sm: { fontSize: 'sm', px: 'sm', py: 'xs' },
        md: { fontSize: 'md', px: 'md', py: 'sm' },
        lg: { fontSize: 'lg', px: 'lg', py: 'md' },
      },
    },
    compoundVariants: [{ size: 'lg', css: { px: '123px', zIndex: 1 } }],
  })

  test('base styles', async () => {
    expect(await classOf(<Button>Click me</Button>, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600',
    )
  })

  test('variant styles', async () => {
    expect(await classOf(<Button size="sm">Click me</Button>, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs',
    )
  })

  test('compound variants', async () => {
    expect(await classOf(<Button size="lg">Click me</Button>, 'button')).toBe(
      'c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_lg px_123px py_md z_1',
    )
  })

  test('class and className both merge last', async () => {
    expect(
      await classOf(
        <Button class="custom-btn" className="other" size="sm">
          Click me
        </Button>,
        'button',
      ),
    ).toBe('c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs custom-btn other')
  })

  test('style prop with variant', async () => {
    expect(
      await classOf(
        <Button class="custom-btn" size="sm" mx="2">
          Click me
        </Button>,
        'button',
      ),
    ).toBe('c_red.500 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_sm px_sm py_xs mx_2 custom-btn')
  })

  test('variant, style prop, css prop and class combined', async () => {
    expect(
      await classOf(
        <Button class="custom-btn" css={{ color: 'red.200', fontSize: 'xl' }} size="lg" mx="2">
          Click me
        </Button>,
        'button',
      ),
    ).toBe('c_red.200 bg_blue.500 hover:c_red.600 hover:bg_blue.600 fs_xl px_123px py_md z_1 mx_2 custom-btn')
  })

  test('nested composition', async () => {
    const StyledButton = styled('button', {
      base: { fontWeight: 'semibold', h: '10' },
      variants: {
        visual: {
          solid: { color: 'white' },
          outline: { borderColor: 'currentColor' },
        },
      },
    })
    const WithSize = styled(StyledButton, {
      base: { colorPalette: 'blue' },
      variants: {
        size: {
          sm: { px: '2', fontSize: '12px' },
          lg: { px: '8', fontSize: '24px' },
        },
      },
    })
    const WithOverrides = styled(WithSize, {
      base: { borderWidth: '4px', h: '20' },
      variants: {
        visual: { outline: { colorPalette: 'red' } },
        size: {
          lg: { px: '12', fontSize: '32px' },
          '2xl': { px: '20', fontSize: '40px' },
        },
      },
    })

    expect(
      await classOf(
        <WithOverrides visual="outline" size="lg">
          Click me
        </WithOverrides>,
        'button',
      ),
    ).toBe('fw_semibold h_20 color-palette_red bd-w_4px bd-c_currentColor px_12 fs_32px')
    expect(
      await classOf(
        <WithOverrides visual="solid" size="2xl">
          Click me
        </WithOverrides>,
        'button',
      ),
    ).toBe('fw_semibold h_20 color-palette_blue bd-w_4px c_white px_20 fs_40px')
  })
})

describe('styled factory with the buttonWithCompoundVariants config recipe', () => {
  const Button = styled('button', buttonWithCompoundVariants)

  test('base styles', async () => {
    expect(await classOf(<Button>Click me</Button>, 'button')).toBe('button button--visual_unstyled')
  })

  test('compound variants', async () => {
    expect(await classOf(<Button visual="solid">Click me</Button>, 'button')).toBe(
      'button button--visual_solid button--compound__visual_solid',
    )
  })

  test('variant, style prop, css prop and class combined', async () => {
    expect(
      await classOf(
        <Button class="custom-btn" css={{ color: 'red.200', fontSize: 'xl' }} size="md" visual="outline" mx="2">
          Click me
        </Button>,
        'button',
      ),
    ).toBe(
      'button button--visual_outline button--size_md button--compound__size_md__visual_outline mx_2 c_red.200 fs_xl custom-btn',
    )
  })

  test('unstyled drops the recipe classes', async () => {
    expect(
      await classOf(
        <Button unstyled visual="solid" mx="2" class="bare">
          Click me
        </Button>,
        'button',
      ),
    ).toBe('mx_2 bare')
  })
})

describe('styled factory options', () => {
  test('defaultProps, including children, sit under passed props', async () => {
    const Button = styled('button', buttonWithCompoundVariants, {
      defaultProps: { visual: 'solid', 'aria-label': 'Close', children: <span>Default</span> },
    })
    const document = await render(<Button visual={undefined} aria-label={undefined} />)
    const button = document.querySelector('button')!

    expect(button.className).toBe('button button--visual_solid button--compound__visual_solid')
    expect(button.getAttribute('aria-label')).toBe('Close')
    expect(button.textContent).toBe('Default')
  })

  test('forwardProps passes a style prop through to the element', async () => {
    const Input = styled('input', {}, { forwardProps: ['width'] })
    const input = (await render(<Input width="20" color="red.300" />)).querySelector('input')!

    expect(input.className).toBe('c_red.300')
    expect(input.getAttribute('width')).toBe('20')
  })

  test('shouldForwardProp decides which props reach the element', async () => {
    const Link = styled('a', {}, { shouldForwardProp: (prop) => prop === 'color' })
    const link = (await render(<Link color="red" bg="blue.500" />)).querySelector('a')!

    expect(link.className).toBe('bg_blue.500')
    expect(link.getAttribute('color')).toBe('red')
  })

  test('dataAttr adds the recipe name', async () => {
    const Button = styled('button', buttonWithCompoundVariants, { dataAttr: true })
    const button = (await render(<Button />)).querySelector('button')!

    expect(button.getAttribute('data-recipe')).toBe('buttonWithCompoundVariants')
  })

  test('as renders another element', async () => {
    const document = await render(
      <styled.div as="section" color="red.300">
        Section
      </styled.div>,
    )

    expect(document.querySelector('section')?.className).toBe('c_red.300')
  })
})

describe('styled elements and patterns', () => {
  test('html props', async () => {
    const div = (await render(<styled.div htmlWidth={123} height="123" />)).querySelector('div[width]')!

    expect(div.getAttribute('width')).toBe('123')
    expect(div.className).toBe('h_123')
  })

  test('box pattern', async () => {
    expect(await classOf(<Box color="red.300">Click me</Box>, 'div')).toBe('c_red.300')
  })

  test('stack pattern', async () => {
    expect(
      await classOf(
        <Stack direction="column" color="red.400">
          Click me
        </Stack>,
        'div',
      ),
    ).toBe('d_flex flex-d_column gap_8px c_red.400')
  })

  test('array css prop', async () => {
    expect(
      await classOf(
        <styled.div css={[{ color: 'blue.300', backgroundColor: 'yellow.300' }, { backgroundColor: 'green.300' }]} />,
        'div',
      ),
    ).toBe('c_blue.300 bg-c_green.300')
  })
})

describe('class lists', () => {
  const Button = styled('button', { base: { color: 'red.500' } })

  test.each<[string, ClassList | Signal<ClassList>, string]>([
    ['a string', 'one two', 'c_red.500 one two'],
    ['an array', ['one', 'two'], 'c_red.500 one two'],
    ['a record', { one: true, two: false, three: 1 }, 'c_red.500 one three'],
    [
      'nested values with falsy entries',
      ['one', null, false, ['two', { three: true, four: false }], undefined],
      'c_red.500 one two three',
    ],
    ['a signal', createSignal(['one', { two: true }]), 'c_red.500 one two'],
  ])('styled.* merges %s after the recipe classes', async (_, value, expected) => {
    expect(await classOf(<Button class={value}>Click me</Button>, 'button')).toBe(expected)
  })

  test('class and className both merge', async () => {
    expect(await classOf(<Button class={['one', { two: true }]} className="three" />, 'button')).toBe(
      'c_red.500 one two three',
    )
  })

  test('unstyled keeps the class list', async () => {
    expect(await classOf(<Button unstyled class={{ bare: true, other: false }} />, 'button')).toBe('bare')
  })

  test('patterns pass class lists through', async () => {
    expect(await classOf(<Box color="red.300" class={['one', { two: true }]} />, 'div')).toBe('c_red.300 one two')
    expect(await classOf(<Stack direction="column" class={{ stacked: true }} />, 'div')).toBe(
      'd_flex flex-d_column gap_8px stacked',
    )
  })
})
