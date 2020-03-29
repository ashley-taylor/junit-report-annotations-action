# junit-report-annotations-action
Create an annotation of the build information and also list first n failed tests as seporate annotations

## Example
```
    - name: Name of branch
      id: branch
      uses: ashley-taylor/junit-report-annotations-action@v1.0
      with:
        value: ${{ github.ref }}
        regex: ".*/"
        replacement: ""
    - name: branch
      run: echo "${{ steps.branch.outputs.value }}"
``` 
   
