---
title: Arduino Unit Testing Software
description: An automated solution for running unit tests on hardware with PlatformIO and fake serial emulation for the DUT
date_display: "2024"
year-start: 2024
tags:
    - hardware
---

## Introduction

Imagine you needed to run firmware unit tests with the actual device in the loop, but nothing *quite* does it the way you want. This is where you decide to [make a 1-click automatic HIL unit testing software rig!](https://xkcd.com/1319/).

I know for a fact there are existing solutions for problems similar to this, but none of them supported mock serial streams to emulate another device in the loop, nor did anything work on PlatformIO in an automatic way.

What I needed was a solution that:

1. Worked with PlatformIO
1. Compiled and deployed code to the board automatically
1. Ran test code with support for mock serial streams to emulate another device (I had an LTE modem connected with AT commands)
1. Allowed for serial capture from a serial analyser (Saleae in this case)
1. Run a bunch of tests sequentially, one after another
1. Displayed the results in a PlatformIO-compliant way
1. Catch all the bugs!

<div style="display: flex; align-items: flex-start; gap: 1rem; width: 100%;">
  <img alt="flow chart of project" src="/projects/arduino-unit-pio/images/flow.png" style="width: calc(60% - 0.5rem)">
  <img alt="hardware in project" src="/projects/arduino-unit-pio/images/setup.png" style="width: calc(40% - 0.5rem)">
</div>

This is all hosted on [Github!](https://github.com/mcloughlan/ArduinoUnitPlatformIO)

## Implementation

Turns out, PlatformIO has it's own [test runner framework](https://docs.platformio.org/en/latest/advanced/unit-testing/frameworks/custom/runner.html) which makes the deployment and output capture easy. AND, Saleae has an API for it's logic analysers.

Perfect.

I used both of these to build a python runner to startup the logic analyser software, wait for the output to read in, then parse it and return it back to PlatformIO.

Simply:

```python
def create_all_test_cases(self) -> List[TestCase]:
        test_cases = []
        # Get lines of serial output
        timestamped_lines = self.get_timestamped_lines()

        for index, line in enumerate(timestamped_lines):
            if re_match := re.search(TestParser.TEST_REGEX, line["line"]):
                test_cases.append(self._generate_test_case(
                    timestamped_lines, re_match, index)) 

        return test_cases
```

Here is an example test where the characters "10" are injected into the fake serial stream (Like an LTE modem talking over serial) and then checked in the serial stream output.

```cpp
void square(Stream &io)
{
  io.print("value? ");
  int x = io.parseInt();
  io.print(x);
  io.print("*");
  io.print(x);
  io.print("=");
  io.println(x * x);
}
test(exampleTest2)
{
  MockStream ms;
  ms.input.print(10);
  square(ms);
  Serial.print("MOCK_OUTPUT: ");
  Serial.println(ms.output);
  assertEqual(ms.output, "value? 10*10=100\r\n");
}
```

These C++ tests are compiled and flashed to the board over JTAG, and then read by the logic analyser

*I could not find test output for the mock stream. I am writing this 2 years after finishing the project*

```text
# Example: timestamped_lines

# {'duration': 0.858, 'line': 'TestRunner started on 2 test(s).'},
# {'duration': 0.002, 'line': 'Test exampleTest1 passed.'},
# {'duration': 0.004, 'line': 'AUnitPlatformIO.ino:12: Assertion failed: (3) != (3).'},
# {'duration': 0.002, 'line': 'Test exampleTest2 failed.'},
# {'duration': 0.003, 'line': 'TestRunner duration: 0.010 seconds.'},
# {'duration': 0.007,
# 'line': 'TestRunner summary: 1 passed, 1 failed, 0 skipped, 0 timed out, out '
#         'of 2 test(s).'}

# Example: timestamped_lines in text form only

# TestRunner started on 2 test(s).
# Test exampleTest1 passed.
# AUnitPlatformIO.ino:12: Assertion failed: (3) != (3).
# Test exampleTest2 failed.
# TestRunner duration: 0.010 seconds.
# TestRunner summary: 1 passed, 1 failed, 0 skipped, 0 timed out, out
```

Then all of this data is presented nicely in PlatformIO's test output window

*pretend this is the output of this program - once again I do not have enough screenshots*

![pio test output](/projects/arduino-unit-pio/images/pio-output.png)

source [PlatformIO](https://piolabs.com/blog/insights/unit-testing-part-2.html)

- Because it's flashed over JTAG, the ESP32's main serial line over USB is free. That could be used as the main test output stream if ever needed.
- Another bonus of this, is that I routed my GPIO outputs (lights, relays, etc) to the serial analyser, so I can add tests for my GPIO pins to be at certain levels and capture that as well.
- Because I opted for a CSV intermediary from the logic analyser, the entire test report is stored and timestamped byte for byte if I needed to analyse it later.

## Conclusion

I wish I had more screenshots.

But nevertheless, I was so pleased to be able to make a testing rig that I could test the entire hardware stack of my project with nothing more than the DUT, programmer board and a logic analyser. Small enough that I could do it on the bus if I needed to.
I needed to test that my device could talk to an LTE modem over serial with AT commands, and this system completely automated it. It was a big step up for me in terms of repeatability and reliability for the testing.
