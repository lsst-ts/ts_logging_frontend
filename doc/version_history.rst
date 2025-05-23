v0.2.0 (2025-05-23)
===================

New Features
------------

- ### This PR does the following:
  - Update the nightly digest frontend to fetch data using the data source adapters; Almanac, ConsDB and Narrative Log.
  - Currently the following metrics cards on top of the page retrieve data from the data source adapters:
      - The exposures metrics card (expected no of exposures is still TBD)
      - Telescope Efficiency metrics card
      - Time Loss metrics card; it should show numbers other than zero if time lost data is available in the narrative log
  - The no of tickets in Jira metrics card is TBD. It should be updated when the Jira adapter is created; see [DM-50983](https://rubinobs.atlassian.net/browse/DM-50983) (`DM-50905 <https://rubinobs.atlassian.net//browse/DM-50905>`_)


Other Changes and Additions
---------------------------

- ### Changes involved in this PR:

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
