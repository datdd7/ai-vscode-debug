import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 20000 // Tăng timeout cho debugger operations
    });

    // Support MOCHA_GREP environment variable
    const grep = process.env.MOCHA_GREP;
    if (grep) {
        console.log(`[TestIndex] Applying grep from env: ${grep}`);
        mocha.grep(grep);
    }

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        glob('suite/*.test.js', { cwd: testsRoot }).then(files => {
            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        }).catch(err => {
            return e(err);
        });
    });
}
