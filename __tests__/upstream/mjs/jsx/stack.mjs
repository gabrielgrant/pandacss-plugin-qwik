import { jsx } from '@qwik.dev/core';
import { stack } from '../patterns/stack.mjs';
import { splitProps } from '../helpers.mjs';
import { panda } from './factory.mjs';

export const Stack = function Stack(props) {
  const [patternProps, restProps] = splitProps(props, stack.propKeys)
  const styleProps = stack.raw(patternProps)
  const mergedProps = { ...styleProps, ...restProps }
  return jsx(panda["div"], mergedProps)
}