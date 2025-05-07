###################
ts_logging_frontend
###################

``ts_logging_frontend`` is a package containing the frontend service for
displaying the different modules and logging summaries from ``ts_logging_and_reporting.``

The frontend is built using Vite and React. To run this project you need to have `node <https://github.com/nodejs/node>`_ installed.
Then you can install dependencies and run the frontend with the following commands:

::

    npm install --legacy-peer-deps

This will install the required dependencies for the frontend. The ``--legacy-peer-deps`` flag is used to avoid issues with peer dependencies.
After the dependencies are installed, you can run the frontend using the following command:

::
    npm run dev

This will start a local server on port 5173. You can access the frontend by navigating to
``http://localhost:5173`` in your web browser.

To run tests, you can use the following command:

::
    
    npm run test

This will run the tests using Vitest, a Vite-native test framework.

This project also uses pre-commit hooks to ensure code quality. Please make sure
to run the following command to install the pre-commit hooks:

::

    pre-commit install

This will set up the pre-commit hooks to run automatically before each commit.
To run the pre-commit hooks manually, you can use the following command:
::

    pre-commit run --all-files
This will run all the pre-commit hooks on all files in the project.
#######
Shadcn
#######
This project uses shadcn/ui for the component library. The components are based on Radix UI and Tailwind CSS.
The components are designed to be easily customizable and extendable. The shadcn/ui library provides a set of pre-built components that can be used to build the frontend.

shadcn is already configured.
- configurations go in `src/components.json`
- Follow instructions in the [docs](https://ui.shadcn.com/docs) to install a component
- Installed components go in `src/components/ui/`

#########################
Styling with Tailwind CSS
#########################
This project uses Tailwind CSS for styling. Tailwind is a utility-first CSS framework that allows you to build custom designs without having to leave your HTML. It provides a set of utility classes that can be used to style your components.
Tailwind is already configured. Global styles and configurations go in:

- `src/index.css` 
- `tailwind.config.js`

