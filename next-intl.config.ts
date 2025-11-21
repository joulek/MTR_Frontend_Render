// next-intl.config.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localeDetection: false ,// 👈 empêcher la suppression de la locale,,
  localePrefix: 'always'   // ⚠️ Important
});

export default routing;
