// Project definitions
// The slug should match the project field in blog posts
export const projects = [
	{
		slug: 'hookedllm',
		name: 'hookedllm',
		description: 'HookedLLM allows you to run hooks before and after LLM calls.',
		url: 'https://github.com/mkarots/hookedllm',
		language: 'Python',
	},
	{
		slug: 'grompt',
		name: 'grompt',
		description: 'Grompt is a tool for decoupling prompts from your code.',
		url: 'https://github.com/mkarots/grompt',
		language: 'Python',
	},
	{
		slug: 'noesis',
		name: 'noesis',
		description: "Noesis aims to make it simple for developers to deploy agentic applications with minimal effort.",
		url: 'https://github.com/mkarots/noesis',
		language: 'Python',
	},
	{
		slug: 'codii',
		name: 'codii.dev',
		description: 'Codii is an AI-powered code review assistant that helps you ship better code.',
		url: 'https://codii.dev',
		language: 'Python & TypeScript',
	},
	{
		slug: 'raglet',
		name: 'raglet',
		description: 'Portable memory for small text corpora. No servers, no API keys, no infrastructure.',
		url: 'https://github.com/mkarots/raglet',
		language: 'Python',
	},
	{
		slug: 'spek',
		name: 'spek',
		description: 'Agentic spec-to-code builder: turn a SPEC.md into an installable, tested package.',
		url: 'https://github.com/mkarots/spek',
		language: 'Python',
	},
	{
		slug: 'tinysh',
		name: 'tinysh',
		description: 'A tiny Unix shell in C, built from scratch in a blog series.',
		url: 'https://github.com/mkarots/tinysh',
		language: 'C',
	},
] as const;

export type ProjectSlug = typeof projects[number]['slug'];
