import { jsx } from '@qwik.dev/core';
import { linkOverlay } from '../patterns/link-overlay';
import { splitProps } from '../helpers';
import { styled } from './factory';
import type { FunctionComponent } from '@qwik.dev/core';
import type { LinkOverlayProperties } from '../patterns/link-overlay';
import type { HTMLStyledProps } from '../types/jsx';
import type { DistributiveOmit } from '../types/system';

export interface LinkOverlayProps extends LinkOverlayProperties, DistributiveOmit<HTMLStyledProps<"a">, keyof LinkOverlayProperties> {}

export const LinkOverlay: FunctionComponent<LinkOverlayProps> = function LinkOverlay(props: LinkOverlayProps) {
  const [patternProps, restProps] = splitProps(props, linkOverlay.propKeys)
  const styleProps = linkOverlay.raw(patternProps)
  const mergedProps = { ...styleProps, ...restProps }
  return jsx(styled["a"], mergedProps)
}