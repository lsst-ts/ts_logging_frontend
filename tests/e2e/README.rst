Running e2e tests
=================

To run the end-to-end (e2e) tests for the Nightly Digest application, follow these steps:

1. **Install Dependencies**: Ensure you have all the necessary dependencies installed.
You can do this by running from the root folder:

  .. code-block:: bash
    
    $ npm install

2. **Install Playwright dependencies**: Playwright requires additional browser binaries.
Install them by running:

  .. code-block:: bash

    $ npx playwright install-deps

3. **Configure your authentication cookie**: The tests require authentication to access the Nightly Digest Dashboard.
Set your `GAFAELFAWR_COOKIE` environment variable with a valid authentication cookie:

  .. code-block:: bash

    $ export GAFAELFAWR_COOKIE='your_cookie_value_here'

You can obtain this cookie by logging into the application in your web browser and inspecting the cookies as shown in
`obtain-gafaelfawr-token.mp4 <obtain-gafaelfawr-token.mp4>`_. Here is a preview:


  .. image:: obtain-gafaelfawr-token.gif
    :alt: Instructions to get Gafaelfawr token cookie.

4. **Run the tests**: You can run the e2e tests using the following command:

  .. code-block:: bash

    $ npx playwright test tests/e2e/

You can also extend the command with additional options:

  .. code-block:: bash

    $ npx playwright test tests/e2e/stress-tests-last-night-base.spec.js --grep "Nightly Digest Dashboard page" --repeat-each=5 --workers=10

The above command will run the "Nightly Digest Dashboard page" tests from the `stress-tests-last-night-base.spec.js` file 5 times each, using 10 parallel workers (if two browser configured, then 10 parallel tests).

Note the following tests are configured to reach remote deployments, not the local development instance:

- `tests/e2e/stress-tests-last-night-usdfdev.spec.js` -> https://usdf-rsp-dev.slac.stanford.edu/nightlydigest
- `tests/e2e/stress-tests-last-5-nights-usdfdev.spec.js` -> https://usdf-rsp-dev.slac.stanford.edu/nightlydigest
- `tests/e2e/stress-tests-last-night-base.spec.js` -> https://base-lsp.lsst.codes/nightlydigest
- `tests/e2e/stress-tests-last-5-nights-base.spec.js` -> https://base-lsp.lsst.codes/nightlydigest

