import { jsx } from '@qwik.dev/core';
import { linkOverlay } from '../patterns/link-overlay.mjs';
import { splitProps } from '../helpers.mjs';
import { panda } from './factory.mjs';

export const LinkOverlay = function LinkOverlay(props) {
  const [patternProps, restProps] = splitProps(props, linkOverlay.propKeys)
  const styleProps = linkOverlay.raw(patternProps)
  const mergedProps = { ...styleProps, ...restProps }
  return jsx(panda["a"], mergedProps)
}