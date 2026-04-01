/**
 * Static GDB/MI test data fixtures
 * Inspired by cortex-debug test suite
 */

export const GDB_MI_FIXTURES = {
    // Simple result record
    simpleResult: '^done',
    
    // Result with data
    resultWithData: '^done,name="value",number=42',
    
    // Console output
    consoleOutput: '&"Hello, World!\\n"',
    
    // Target output
    targetOutput: '=msg,"Target message"',
    
    // Log output
    logOutput: '@"Log message\\n"',
    
    // Stopped event (breakpoint hit)
    stoppedBreakpoint: '*stopped,reason="breakpoint-hit",disp="keep",bkptno="1",frame={addr="0x00000000004005e4",func="main",args=[],file="main.c",fullname="/home/user/main.c",line="10"},thread-id="1",stopped-threads="all",core="0"',
    
    // Stopped event (step complete)
    stoppedStep: '*stopped,reason="end-stepping-range",frame={addr="0x00000000004005f0",func="foo",file="foo.c",line="5"},thread-id="1"',
    
    // Running event
    running: '*running,thread-id="all"',
    
    // Exited event
    exited: '=exited,code="0"',
    
    // Stack frame
    stackFrame: 'frame={level="0",addr="0x00000000004005e4",func="main",file="main.c",line="10"}',
    
    // Variable
    variable: 'name="x",value="42",type="int"',
    
    // Locals list
    localsList: 'locals=[{name="x",value="42",type="int"},{name="y",value="0",type="int"}]',
    
    // Empty response
    empty: '',
    
    // GDB prompt
    prompt: '(gdb)',
    
    // Unicode content
    unicode: '&"Hello 世界\\n"',
    
    // Escaped characters
    escaped: '&"Line 1\\nLine 2\\tTabbed\\n"',
};

export const EXPECTED_PARSED_OUTPUTS = {
    simpleResult: {
        token: undefined,
        outOfBandRecord: [],
        resultRecords: {
            resultClass: 'done',
            results: []
        }
    },
    
    stoppedBreakpoint: {
        token: undefined,
        outOfBandRecord: [{
            isStream: false,
            type: 'exec',
            asyncClass: 'stopped',
            output: [
                ['reason', 'breakpoint-hit'],
                ['disp', 'keep'],
                ['bkptno', '1'],
                ['frame', [
                    ['addr', '0x00000000004005e4'],
                    ['func', 'main'],
                    ['args', []],
                    ['file', 'main.c'],
                    ['fullname', '/home/user/main.c'],
                    ['line', '10']
                ]],
                ['thread-id', '1'],
                ['stopped-threads', 'all'],
                ['core', '0']
            ]
        }],
        resultRecords: {
            resultClass: '',
            results: []
        }
    }
};
