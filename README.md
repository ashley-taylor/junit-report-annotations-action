# junit-report-annotations-action
Add check runs to your CI with annotations listing the test failures.

## Setup

```
- uses: turpif/junit-report-annotations-action@0.1.0
  if: always()
  with:
    access-token: ${{ secrets.GITHUB_TOKEN }}
```

## Parameters

TODO

# Demonstration

Actions in this repository demonstrate what this GitHub Action is doing.

A successful run will look like

![Pass](./doc/pass.png?raw=true)

A failed run will look like

![Fail](./doc/fail.png?raw=true)
