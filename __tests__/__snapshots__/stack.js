import { jsx } from '@qwik.dev/core';
import { splitProps } from '../helpers';
import { stackRaw } from '../patterns/stack';
import { styled } from './factory';

export const Stack = function Stack(props) {
  const [patternProps, restProps] = splitProps(props, ["align","direction","gap","justify"])
  const styleProps = stackRaw(patternProps)
  return jsx(styled["div"], { ...styleProps, ...restProps })
}
