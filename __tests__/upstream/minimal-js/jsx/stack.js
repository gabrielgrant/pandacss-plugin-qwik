import { jsx } from '@qwik.dev/core';
import { stack } from '../patterns/stack';
import { splitProps } from '../helpers';
import { styled } from './factory';
import { mergeCss } from '../css/css';

export const Stack = function Stack(props) {
  const [patternProps, restProps] = splitProps(props, stack.propKeys)
  const styleProps = stack.raw(patternProps)
  const mergedProps = { ...restProps, css: mergeCss(styleProps, props.css) }
  return jsx(styled["div"], mergedProps)
}