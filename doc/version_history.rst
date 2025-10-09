v0.10.0 (2025-10-09)
====================

New Features
------------

- Add a Context Feed page to Nightly Digest that uses rubin-nights to get consolidated data. (`OSW-666 <https://rubinobs.atlassian.net//browse/OSW-666>`_)
- Show fault time in Time accounting applet based on the calculated overhead for each exposure as well as calculated dome closed time from rubin-nights (`OSW-992 <https://rubinobs.atlassian.net//browse/OSW-992>`_)


Bug Fixes
---------

- Data Log now supports AuxTel data. (`OSW-764 <https://rubinobs.atlassian.net//browse/OSW-764>`_)
- Fix bug in Data Log's psf median column. (`OSW-1047 <https://rubinobs.atlassian.net//browse/OSW-1047>`_)


Other Changes and Additions
---------------------------

- The calendar defaults to the date last entered (`OSW-909 <https://rubinobs.atlassian.net//browse/OSW-909>`_)
- Plots default view uses dots and shows band markers and colors. (`OSW-949 <https://rubinobs.atlassian.net//browse/OSW-949>`_)
- Band key on Plots page shows colored circles when ‘Colors’ is selected and colored shapes when ‘Colors and Icons’ is selected. (`OSW-967 <https://rubinobs.atlassian.net//browse/OSW-967>`_)
- Added DIMM seeing to the Data Log. (`OSW-968 <https://rubinobs.atlassian.net//browse/OSW-968>`_)
- Show/Hide Plots pop-up lists fields in alphabetical order. (`OSW-969 <https://rubinobs.atlassian.net//browse/OSW-969>`_)
- In observing conditions applet, don't show gaps if the exposure is off sky or if psf_median and zero_point_median are null (`OSW-994 <https://rubinobs.atlassian.net//browse/OSW-994>`_)
- Update sidebar link to go to main instead of develop. (`OSW-998 <https://rubinobs.atlassian.net//browse/OSW-998>`_)
- Add physical filter column to Data Log. (`OSW-1003 <https://rubinobs.atlassian.net//browse/OSW-1003>`_)
- Add make_release.py script to handle releases. (`OSW-1005 <https://rubinobs.atlassian.net//browse/OSW-1005>`_)
- Sidebar toggle displays, on hover, the keyboard shortcut. (`OSW-1092 <https://rubinobs.atlassian.net//browse/OSW-1092>`_)
- Context Feed supports rubin_nights v0.6.1 data. (`OSW-1119 <https://rubinobs.atlassian.net//browse/OSW-1119>`_)


v0.8.0 (2025-09-02)
===================

New Features
------------

- Plots page added (`OSW-664 <https://rubinobs.atlassian.net//browse/OSW-664>`_)
- Add the Time Accounting applet. (`OSW-665 <https://rubinobs.atlassian.net//browse/OSW-665>`_)
- Add night summary applet. (`OSW-667 <https://rubinobs.atlassian.net//browse/OSW-667>`_)
- Add dome temperature column to data log. (`OSW-780 <https://rubinobs.atlassian.net//browse/OSW-780>`_)
- Discard exposure time that starts outside the nautical twilights when calculating efficiency. (`OSW-832 <https://rubinobs.atlassian.net//browse/OSW-832>`_)
- Add context feed in progress page. (`OSW-945 <https://rubinobs.atlassian.net//browse/OSW-945>`_)


Bug Fixes
---------

- Fix NightSummary header layout when the day selector is not shown. (`OSW-667 <https://rubinobs.atlassian.net//browse/OSW-667>`_)
- Update `calculateEfficiency` util function to accept `weatherLoss` in hours not seconds. (`OSW-887 <https://rubinobs.atlassian.net//browse/OSW-887>`_)


Other Changes and Additions
---------------------------

- Change PSF Seeing label as requested, add other exp data to the tooltip (`OSW-853 <https://rubinobs.atlassian.net//browse/OSW-853>`_)
- Add Nightly Digest release no and links to frontend and backend version history in the footer of the sidebar. (`OSW-867 <https://rubinobs.atlassian.net//browse/OSW-867>`_)
- Update content labels in upcoming applets. (`OSW-937 <https://rubinobs.atlassian.net//browse/OSW-937>`_)


v0.7.1 (2025-08-07)
===================

Bug Fixes
---------

- Add null checks and fallback to empty array to prevent errors when data is undefined (`OSW-810 <https://rubinobs.atlassian.net//browse/OSW-810>`_)
- Fix broken filter when moving from Exposure Breakdown to Data Log (`OSW-814 <https://rubinobs.atlassian.net//browse/OSW-814>`_)
- Fix the colors and shapes in the plot and the legend to follow the plotting guidelines. (`OSW-815 <https://rubinobs.atlassian.net//browse/OSW-815>`_)
- Allow users to show zero points of a certain band while hiding other bands when hovering over this band icon in the legend. (`OSW-815 <https://rubinobs.atlassian.net//browse/OSW-815>`_)


v0.7.0 (2025-08-05)
===================

New Features
------------

- Introduce Observing Conditions Applet in digest page (`OSW-646 <https://rubinobs.atlassian.net//browse/OSW-646>`_)


Bug Fixes
---------

- Fix broken external links by setting USDF prod as util const. (`OSW-702 <https://rubinobs.atlassian.net//browse/OSW-702>`_)


Other Changes and Additions
---------------------------

- Data Log default column visibility, ordering and sorting updates. (`OSW-742 <https://rubinobs.atlassian.net//browse/OSW-742>`_)
- Update Data Log info text. (`OSW-750 <https://rubinobs.atlassian.net//browse/OSW-750>`_)


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
