import * as path from 'node:path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'content'),
  title: 'Smart Address',
  description: 'Reliable address suggestions for checkout and onboarding.',
  lang: 'en',
  logoText: 'Smart Address',
  locales: [
    { lang: 'en', label: 'English' },
    { lang: 'cs', label: 'Čeština' },
  ],
  route: {
    cleanUrls: true,
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/NMIT-WR/new-engine',
      },
    ],
  },
  llms: true,
});
