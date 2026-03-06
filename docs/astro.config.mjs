// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/docs',
	integrations: [
		starlight({
			title: 'Infra Pilot',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/physikal/infra-pilot',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ slug: 'getting-started/introduction' },
						{ slug: 'getting-started/installation' },
						{ slug: 'getting-started/setup-wizard' },
					],
				},
				{
					label: 'Apps',
					items: [
						{ slug: 'apps/overview' },
						{ slug: 'apps/deploying' },
						{ slug: 'apps/managing' },
						{ slug: 'apps/routing' },
					],
				},
				{
					label: 'Integrations',
					items: [
						{ slug: 'integrations/nomad' },
						{ slug: 'integrations/cloudflare' },
						{ slug: 'integrations/traefik' },
						{ slug: 'integrations/proxmox' },
						{ slug: 'integrations/github' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ slug: 'reference/architecture' },
						{ slug: 'reference/api' },
						{ slug: 'reference/configuration' },
					],
				},
			],
		}),
	],
});
