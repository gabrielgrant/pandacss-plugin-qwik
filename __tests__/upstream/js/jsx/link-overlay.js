import { jsx } from '@qwik.dev/core';
import { linkOverlay } from '../patterns/link-overlay';
import { splitProps } from '../helpers';
import { styled } from './factory';

export const LinkOverlay = function LinkOverlay(props) {
  const [patternProps, restProps] = splitProps(props, linkOverlay.propKeys)
  const styleProps = linkOverlay.raw(patternProps)
  const mergedProps = { ...styleProps, ...restProps }
  return jsx(styled["a"], mergedProps)
}