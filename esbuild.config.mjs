import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const watch = process.argv.includes('--watch');

const context = await esbuild.context({
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: ['obsidian', '@codemirror/state', '@codemirror/view'],
	platform: 'browser',
	target: 'es2022',
	format: 'cjs',
	outfile: 'main.js',
	sourcemap: watch ? 'inline' : false,
	minify: !watch,
	alias: {},
});

function copyStyles() {
	const src = path.join('styles', 'styles.css');
	const dest = 'styles.css';
	if (fs.existsSync(src)) {
		fs.copyFileSync(src, dest);
		console.log('Styles copied.');
	}
}

if (watch) {
	await context.watch();
	copyStyles();
	console.log('Watching for changes...');
} else {
	await context.rebuild();
	await context.dispose();
	copyStyles();
	console.log('Build complete.');
}