import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { defineConfig } from 'rollup';

export default defineConfig({
    input: 'src/index.tsx',
    output: {
        file: 'dist/index.js',
        format: 'iife',
        globals: {
            'decky-frontend-lib': 'DFL',
            'react': 'SP_REACT',
            'react-dom': 'SP_REACTDOM'
        },
    },
    external: ['decky-frontend-lib', 'react', 'react-dom'],
    plugins: [
        resolve(),
        commonjs(),
        json(),
        typescript(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            preventAssignment: true,
        }),
    ],
});
