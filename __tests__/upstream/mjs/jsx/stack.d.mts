import type { FunctionComponent } from '@qwik.dev/core';
import type { StackProperties } from '../patterns/stack.mjs';
import type { HTMLPandaProps } from '../types/jsx.mjs';
import type { DistributiveOmit } from '../types/system.mjs';

export interface StackProps extends StackProperties, DistributiveOmit<HTMLPandaProps<'div'>, keyof StackProperties> {}
export declare const Stack: FunctionComponent<StackProps>;