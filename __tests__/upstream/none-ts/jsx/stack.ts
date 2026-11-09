import { jsx } from '@qwik.dev/core';
import { stack } from '../patterns/stack';
import { splitProps } from '../helpers';
import { styled } from './factory';
import type { FunctionComponent } from '@qwik.dev/core';
import type { StackProperties } from '../patterns/stack';
import type { HTMLStyledProps } from '../types/jsx';
import type { DistributiveOmit } from '../types/system';

export interface StackProps extends StackProperties, DistributiveOmit<HTMLStyledProps<"div">, keyof StackProperties> {}

export const Stack: FunctionComponent<StackProps> = function Stack(props: StackProps) {
  const [patternProps, restProps] = splitProps(props, stack.propKeys)
  const styleProps = stack.raw(patternProps)
  const mergedProps = { ...restProps, css: styleProps }
  return jsx(styled["div"], mergedProps)
}