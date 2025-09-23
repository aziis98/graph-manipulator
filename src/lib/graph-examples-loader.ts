import prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginHtml from 'prettier/plugins/html'

import type { DecoratedGraph } from './graphs'

import * as GraphExamples from './graph-examples'

async function exampleToString(fn: () => any): Promise<string> {
    const original = fn.toString()
    console.log('Original:', original)

    const formatted = await prettier.format(original, {
        parser: 'babel',
        plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginHtml],

        // very compact output
        printWidth: 50,
        tabWidth: 2,
        useTabs: false,
        semi: false,
        singleQuote: true,
        trailingComma: 'none',
        bracketSpacing: true,
        arrowParens: 'avoid',
        objectWrap: 'collapse',
    })

    console.log('Formatted:', formatted)

    return formatted
        .trim()
        .replace(/^function \w+\(\) {/, '')
        .replace(/}$/, '')
        .replace(/^  /gm, '')
        .trim()
    // remove trailing semicolon
}

export async function loadGraphExamples(): Promise<Record<string, string>> {
    const examples: Record<string, string> = {}

    for (const [name, fn] of Object.entries(GraphExamples)) {
        if (typeof fn === 'function') {
            try {
                const code = await exampleToString(fn as () => any)
                examples[name] = code
            } catch (e) {
                console.error(`Error processing example ${name}:`, e)
            }
        }
    }

    return examples
}
