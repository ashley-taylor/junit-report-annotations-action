# junit-report-annotations-action
Create an annotation of the build information and also list first n failed tests as seporate annotations

## Example
```
    - uses: ashley-taylor/junit-report-annotations-action@v1.0
      if: always()
      with:
        access-token: ${{ secrets.GITHUB_TOKEN }}
``` 
   
