/*
    Copyright (c) 2024 Alan de Freitas (alandefreitas@gmail.com)

    Distributed under the Boost Software License, Version 1.0. (See accompanying
    file LICENSE_1_0.txt or copy at http://www.boost.org/LICENSE_1_0.txt)

    Official repository: https://github.com/alandefreitas/antora-cpp-tagfiles-extension
*/


import test, {describe, it} from "node:test"
import {ok, strictEqual} from "node:assert"

import fs from 'fs'
import CppTagfilesExtension from '../lib/extension.js'
import {fileURLToPath} from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class generatorContext {
    constructor() {
        this.attributes = {}
    }

    on(eventName, Function) {
        ok(eventName === 'contentAggregated' || eventName === 'beforeProcess')
    }

    getLogger(name) {
        ok(name === 'cpp-tagfile-extension')
        const noop = () => {
        }
        return {
            trace: noop,
            debug: noop,
            info: noop,
            warn: noop,
            error: noop
        }
    }
}

describe('The extension produces links to C++ symbols', () => {
    // ============================================================
    // Create extension object
    // ============================================================
    const antoraConfigFileContent = fs.readFileSync("test/antoraConfig.json", 'utf8')
    const {config, playbook, contentAggregate} = JSON.parse(antoraConfigFileContent)
    playbook.dir = __dirname
    for (let content of contentAggregate) {
        for (let origin of content.origins) {
            origin.worktree = path.resolve(__dirname, '..')
        }
    }
    const antoraContext = new generatorContext()
    const extension = new CppTagfilesExtension(antoraContext, {config, playbook})
    extension.onContentAggregated({playbook, contentAggregate})

    // ============================================================
    // Load fixtures.json file with node.js built-in filesystem module
    // ============================================================
    const fileContent = fs.readFileSync("test/fixtures.json", 'utf8')
    const fixtures = JSON.parse(fileContent)

    // ============================================================
    // Iterate fixtures and run tests
    // ============================================================
    for (const {name, tests} of fixtures) {
        test(name, () => {
            for (const {input, output, component, attributes} of tests) {
                // Create a parent object with the component
                // parent?.document?.getAttributes()['page-component-name'] should return the component name
                const parent = component ? {
                    document: {
                        getAttributes: () => {
                            return {
                                'page-component-name': component
                            }
                        }
                    }
                } : {}
                const target = input
                const attr = attributes ? attributes : {}
                const result = extension.process(parent, target, attr)
                const error_message = `
                    Test failed for input: ${input} (component: ${component}). 
                    Expected: ${output}, 
                    but got: ${result}`;
                strictEqual(result, output, error_message)
            }
        })
    }
});