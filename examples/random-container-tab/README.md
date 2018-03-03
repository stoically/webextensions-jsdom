Random Container Tab adds a toolbar icon. Clicking it reveals a popup with two buttons:

* "Create a random container" which you click first
* Then click the "Create a tab in the last created random container" and it'll open a tab accordingly

Much features. Much wow.


### Loading in Firefox

* Navigate to `about:debugging` and load `src/manifest.json`
* `web-ext run -s src`


### Running the tests

The feature test located in `test/feature.test.js` can be executed by doing

```
npm install
npm test
```

### Genrate coverage

If you want to see coverage you can by doing

```
npm install
npm run coverage
```

This will output % summary and output a more detailed report into the `coverage/` directory.