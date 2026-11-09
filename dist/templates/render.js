/**
 * Templates are TypeScript source with the type-only parts wrapped in «»: kept for
 * `outExtension: 'ts'`, removed for JavaScript, the same split Panda's codegen makes.
 */
export const render = (template, { ts }) => ts ? template.replace(/[«»]/g, '') : template.replace(/«[^»]*»/g, '');
