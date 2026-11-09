import type { FunctionComponent } from '@qwik.dev/core';
import type { LinkOverlayProperties } from '../patterns/link-overlay.mjs';
import type { HTMLPandaProps } from '../types/jsx.mjs';
import type { DistributiveOmit } from '../types/system.mjs';

export interface LinkOverlayProps extends LinkOverlayProperties, DistributiveOmit<HTMLPandaProps<'a'>, keyof LinkOverlayProperties> {}
export declare const LinkOverlay: FunctionComponent<LinkOverlayProps>;