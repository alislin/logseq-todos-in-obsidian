import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const context = await esbuild.context({
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: ['obsidian'],
	platform: 'browser',
	target: 'es2022',
	format: 'cjs',
	outfile: 'main.js',
	sourcemap: watch ? 'inline' : false,
	minify: !watch,
	alias: {},
});

if (watch) {
	await context.watch();
	console.log('Watching for changes...');
} else {
	await context.rebuild();
	await context.dispose();
	console.log('Build complete.');
}