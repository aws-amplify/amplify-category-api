# Using this test app

This test app has capabilities to deploy a backend amplify project, tear down said project, and execute a ui test suite against the running app using the full backend.

To facilitate easier dev/test cycles, the `test` there are 4 test lifecycles defined with custom targets to make it easier to develop.

`npm run test` will execute all of these lifecycles.
`npm run test:setup` will strictly setup the amplify app in your DEFAULT aws profile.
`npm run test:teardown` will execute an `amplify delete` on the project.
`npm run test:execute` will start the webapp, and run the cypress suite against it.
`npm run test:watch` will start the app, and open a cypress watch against it.

In addition to these targets, `npm start` can still be used to run the app locally (recommended after `npm run test:setup` to develop new test pages/cases), and `npx cypress open` can be used to interactively run/re-run the cypress suite, this is probably preferable to using just `npm run test:watch` but I don't have a strong opinion on that yet.

## Test Structure

Both the amplify app setup, and basic CRUD+List+Observe functionality rely on test harnesses to reduce the per-test load of creating a UI that uses our API/DataStore clients, and managing basic lifecycle concerns like app setup, teardown, invoking cypress, etc.

Cypress suites are still written by hand in the `cypress` directory, though we could build helpers given the consistent structure of the UI due to these harnesses.

Backend setup code is available at [api.test.ts](src/__tests__/api.test.ts), and top-level app pages can be found in the [pages](src/pages/) directory.

## CLI Interactions

This project uses a stripped down version of the `amplify-e2e-core` shims for shelling out to Amplify. This is expected to be shortly refactored back to a shared lib, but the reason we don't use that directly is due to the large dep-tree it invokes, including the actual CLI source code, which causes issues with jest. This is also potentially mitigable, but while I was under the hood, I simplified the API a bit as well, which I'm happy with. The refactored bits list in the `__tests__/utils` directory, in addition to the test harness package, which is expected to be re-used across apps for consistency.

# About this Repo

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
