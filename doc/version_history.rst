v0.6.0 (2025-07-16)
===================

New Features
------------

- Grab on-sky exposures count and total on-sky exposure time from response in fetchExposures and use them in the no of exposures and efficiency metric cards (`OSW-541 <https://rubinobs.atlassian.net//browse/OSW-541>`_)
- Implement Data Log page. (`OSW-572 <https://rubinobs.atlassian.net//browse/OSW-572>`_)
- Introduce routing, using TanStack Router, to allow navigating to different pages. Also use URL parameters to hold common state/parameters across different pages. (`OSW-644 <https://rubinobs.atlassian.net//browse/OSW-644>`_)


Bug Fixes
---------

- Make the jira tickets table scrollable and use sticky headers. Also make the popup wider to stop columns from running into each other. (`OSW-648 <https://rubinobs.atlassian.net//browse/OSW-648>`_)


Other Changes and Additions
---------------------------

- Remove decimal points from time loss and efficiency cards (`OSW-647 <https://rubinobs.atlassian.net//browse/OSW-647>`_)


v0.5.0 (2025-07-01)
===================

New Features
------------

- Add a metric card component that could be clicked to open a modal with more details about the metric. (`OSW-556 <https://rubinobs.atlassian.net//browse/OSW-556>`_)
- Use the new metric card component for the jira tickets metrics card and show the modal with the list of tickets created or updated within the selected dayobs range. (`OSW-556 <https://rubinobs.atlassian.net//browse/OSW-556>`_)
- Show the number of tickets updated within the selected dayobs range in the jira tickets metrics card. (`OSW-556 <https://rubinobs.atlassian.net//browse/OSW-556>`_)
- Display dayobs range on sidebar (`OSW-581 <https://rubinobs.atlassian.net//browse/OSW-581>`_)


Performance Enhancement
-----------------------

- Add AbortController to clean up useEffect. (`OSW-550 <https://rubinobs.atlassian.net//browse/OSW-550>`_)


v0.4.0 (2025-06-17)
===================

New Features
------------

- Add ACCESS_TOKEN, JIRA_API_TOKEN, JIRA_API_HOSTNAME to backend service environment in docker compose (`OSW-500 <https://rubinobs.atlassian.net//browse/OSW-500>`_)
- Fetch jira tickets created between start and end days for the selected instrument/telescope and display no of tickets in the Jira metrics card. Clicking on the card open Jira to explore queried tickets. (`OSW-500 <https://rubinobs.atlassian.net//browse/OSW-500>`_)
- Log HTTP exceptions and other error to console and show toasts to notify users of errors (`OSW-501 <https://rubinobs.atlassian.net//browse/OSW-501>`_)
- Implement an Exposure Breakdown applet. (`OSW-504 <https://rubinobs.atlassian.net//browse/OSW-504>`_)


Bug Fixes
---------

- Update open shutter efficiency calculation. (`OSW-517 <https://rubinobs.atlassian.net//browse/OSW-517>`_)


Other Changes and Additions
---------------------------

- Add loading state for each data source and use them to show skeleton in the metrics cards while data is being fetched (`DM-51148 <https://rubinobs.atlassian.net//browse/DM-51148>`_)


v0.3.0 (2025-06-05)
===================

New Features
------------

- Remove end dayobs date picker (`DM-50966 <https://rubinobs.atlassian.net//browse/DM-50966>`_)
- Add a number input for number of nights (`DM-50966 <https://rubinobs.atlassian.net//browse/DM-50966>`_)
- Add util functions to calculate start and end dayobs (`DM-50966 <https://rubinobs.atlassian.net//browse/DM-50966>`_)
- Use dayobs and no of nights specified to calculate start and end dayobs and fetch data within that range (`DM-50966 <https://rubinobs.atlassian.net//browse/DM-50966>`_)


Other Changes and Additions
---------------------------

- Add changelog workflow to check towncrier fragments are created. (`DM-50952 <https://rubinobs.atlassian.net//browse/DM-50952>`_)
- Add integration tools for local development. (`OSW-490 <https://rubinobs.atlassian.net//browse/OSW-490>`_)


v0.2.0 (2025-05-23)
===================

New Features
------------

- Update the nightly digest frontend to fetch data using the data source adapters; Almanac, ConsDB and Narrative Log.
- Currently the following metrics cards on top of the page retrieve data from the data source adapters:
- The exposures metrics card (expected no of exposures is still TBD)
- Telescope Efficiency metrics card
- Time Loss metrics card; it should show numbers other than zero if time lost data is available in the narrative log
- The no of tickets in Jira metrics card is TBD. It should be updated when the Jira adapter is created; see [DM-50983](https://rubinobs.atlassian.net/browse/DM-50983) (`DM-50905 <https://rubinobs.atlassian.net//browse/DM-50905>`_)


Other Changes and Additions
---------------------------

- Efficiency icon: fix bug in passing value to icon plot
- Time Loss icon: replace corrupted svg
- Rubin icon: move svg to /assets folder
- Info icon: replace previous Tooltip component with Popover component for tablet accessibility
- Info and Download icons: add placeholders to Applets and bring display in line with design (`DM-50976 <https://rubinobs.atlassian.net//browse/DM-50976>`_)


v0.1.0 (2025-05-06)
===================

New Features
------------

- Set initial files templating for a Vite + React project. (`DM-50544 <https://rubinobs.atlassian.net//browse/DM-50544>`_)
