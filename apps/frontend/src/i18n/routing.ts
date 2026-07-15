import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
  localePrefix: 'always', // /uz/dashboard, /ru/dashboard, etc.
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
