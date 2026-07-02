Definitions and Assumptions for Time Accounting
===============================================

- **Open dome times** are in **UTC**.
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

- **closed_hours** for a completed night::

    max(0, first_dome_open - night_start)
    + max(0, night_end - last_dome_close)
    + (time between any additional dome close/open periods)

  This represents how long the dome was closed **during actual night time**.

- If the dome was never opened during the night, this equals the full night length between 12° twilights.

- **closed_hours** for an ongoing night means **closed so far**::

    max(0, elapsed_twilight_hours - open_hours)

  where ``elapsed_twilight_hours`` is the time since ``night_start`` up to "now",
  clamped to the night window, and ``open_hours`` is the elapsed twilight-overlap
  open time returned by Rubin Nights.

Visit Selection
---------------

- **On-sky visits** = visits where ``can_see_sky = True``  
  and whose ``obs_start`` falls between ``night_start`` → ``night_end``.  

- **exposure time** is the sum of exposure time for on_sky visits between the nautical twilights.

Calculated Fault Time
---------------------

- **calculated_fault_time**::

    elapsed_twilight_hours
        - sum(on_sky_visits.exp_time) 
        - sum(on_sky_visits.valid_overhead) 
        - time_lost_to_weather

- **valid_overhead** = ``min(visit_gap, slew_model + 2 minutes)``
- **time_lost_to_weather** is derived from the Observatory Status ``weather`` metric,
  i.e. the overlap between 12°-twilight night intervals and Observatory Status
  intervals whose bitmask contains the ``WEATHER`` state.

- Inter-exposure gap time (``visit_gap``) is displayed separately in the applet
  and is **not** subtracted in the current calculated-fault formula.

Additional Rules
----------------
- For an ongoing night, both calculated fault and closed dome time are calculated
  against elapsed twilight hours rather than the full hours between the 12-degree twilights.

- If there are **no exposures** and the **dome was closed all night**,  
  the fault calculation remains valid.  
  (Note: in such a case most of the night will be counted as fault,  
  but closed-dome time may still appear as 0 — see entry for *2025-10-01*.)
