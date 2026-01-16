Definitions and Assumptions for Time Accounting
===============================================

- **Open dome times** are in **TAI**.
- **Almanac twilight times** are in **UTC**.
- **Night start** = \-12° twilight sunset.
- **Night end** = \-12° twilight sunrise.

Observation Window
------------------

- **obs start** = ``max(night_start, first_dome_open)``  
  Useful for statements like *"get on sky faster"*, but **not** used for fault counting.

- **obs end** = ``min(night_end, last_dome_close)``  
  Useful for statements like *"don't close early"*, but **not** used for fault counting.

Closed Dome Accounting
----------------------

- **dome_close_within_night**::

    max(0, first_dome_open - night_start)
    + max(0, night_end - last_dome_close)
    + (time between any additional dome close/open periods)

  This represents how long the dome was closed **during actual night time**.

- If the dome was never opened during the night, this will equal the full night length between 12° twilights.

Visit Selection
---------------

- **On-sky visits** = visits where ``can_see_sky = True``  
  and occurring between ``night_start`` → ``night_end``.  

- The visit query fetches **all visits within night_start → night_end**, regardless of ``can_see_sky``.

- There is **no need to fetch data from the previous night**,  
  though the query window may be extended **1 hour before sunset** if needed.

Fault / Idle Time
-----------------

- **fault_idle_time**::

    night_end - night_start 
        - sum(on_sky_visits.exp_time) 
        - sum(on_sky_visits.valid_overhead) 
        - min(dome_closed_within_night, fault_loss_weather)

- **valid_overhead** = ``min(visit_gap, slew_model + 2 minutes)``

Additional Rules
----------------

- Fault and closed-dome times **are not calculated during an ongoing night**.  
  A warning will be shown above the plot.

- If the night is still ongoing **and more than one night is selected**,  
  ongoing-night accounting is ignored.

- If there are **no exposures** and the **dome was closed all night**,  
  the fault calculation remains valid.  
  (Note: in such a case most of the night will be counted as fault,  
  but closed-dome time may still appear as 0 — see entry for *2025-10-01*.)
