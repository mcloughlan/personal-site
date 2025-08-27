---
title: NetCheck
description: A persistent network uptime and speed logging Grafana exporter intended for use on multiple Raspberry Pis
---

## Dashboard screenshot

![Screenshot of the NetCheck interface](/projects/netcheck/images/summary.webp){width=800px height=1256px loading=lazy}

From [https://github.com/mcloughlan/NetCheck](https://github.com/mcloughlan/NetCheck)

## Introduction

I used to work at a residential college where the IT team had the occasional issue of APs dropping in and out. So we would go and sit next to it and check if it was working. Sometimes that was enough to tell it was broken and needed more investigation. However sometimes it needed to be monitored for hours at a time to find the problem.

We didn't have access to any of the AP infrastructure, as this was managed by an external provider. But any time we wanted an issue solved with the network we needed to contact that provider with details of the issue. So we needed to both verify the issue ourselves, and build a case for the provider to look into.

So there were no tools we could use to validate these issues, and no time to sit next to an AP and check it was playing up. That's where this project came into play. The idea was we could just leave a bunch of Raspberry Pis in locations that were possibly troublesome, and then wait for them to pickup an issue automatically.

## Design

![Netcheck design flowchart](https://raw.githubusercontent.com/mcloughlan/NetCheck/main/assets/flowchart.svg){loading=lazy}

This needed to be as simple and easy to deploy as possible. With the capabilities for seamless scaling with multiple deployed nodes. The design also needed to be **completely free** (excluding paying for a raspberry pi) by using the free configuration of Grafana Cloud and the Grafana dashboard. Note that Ookla speedtest (one of the metric gatherers for this) has a rate limit for your IP.

### Setup & deployability

With these restraints, I designed a system where each Pi would host a Docker container that runs the whole system which is configured to boot on start and restart on fail. This way, there was no painful setup across different systems and system-dependent errors were less common in development, given the whole thing was containerised. After the Docker setup, you could just pull the power plug on the Pi, move it around and plug it back in and the whole thing would **just work**. This achieved my goals of making it easy to deploy.

### Scaling with ease

Now what if I want node 1 in this part of the building, then node 3 over here and node 2 can just sit in my office?

Well the visualisation and UI design of this was easy. Given each device has a [hard coded name in the config](https://github.com/mcloughlan/NetCheck/blob/3494e07d93f0e3dabec84038ad4d26f69902a494/templates/.env.template#L20), Grafana would have a dedicated section for the device you selected at the top (see [dashboard](#dashboard-screenshot)). Then if you had multiple devices, they would just tile up next to each other in the upper summary section. Pushing to the database was also okay, because you have each device with a different name.

But the hard part was adhering to the *'one speedtest per hour per IP address'* rule by Ookla.
Given there was no obvious way to ask Ookla if the next test test would be limited (they probably rate limit with more rules than just 1 per hour), I decided I would just keep tabs on how many I've been running, and who's turn it is.

So I needed to

1. Keep track of when the last test was
    - This needed to be available on the cloud so it was available to all devices in the system. Because some devices could go offline when others want to check their position in the queue
1. Figure out if the device can run a test ("*will this test cause a rate limit?*")
1. Run tests in a round robin way to equally query each device

#### Speedtest distributor/orchestrator design

*Firstly, shout-out to my wonderful friend and career mentor James Baker who put me onto the orchestrator/driver model.*

<br>

The approach I took was to use the Grafana database as a lazy orchestrator, where the clients would [just query it](https://github.com/mcloughlan/netcheck-api/blob/041f639cbbe04b8c63e7f3628ff6ea344041fa20/src/web.py#L70-L148) and see who's been pushing data and when.

Here's a basic sample of getting the number of devices online

```python
if RESULT_JSON["status"] == "success":
    ORIGINS = [x["metric"]["origin_prometheus"]
                for x in RESULT_JSON["data"]["result"]]
    logging.info(f"Devices found online: {ORIGINS}")
    # If 0 devices are reported online, assume 1
    return max(len(ORIGINS), 1)
else:
    logging.error(
        f"Valid HTTP JSON response collected, but API returned status: {RESULT_JSON['status']}")
    return None
```

Then, based on when the number of devices online and the time the device joined the session, it would now know when to wait for the next test with the round robin effect.

![distributor design flowchart](https://raw.githubusercontent.com/mcloughlan/NetCheck/main/assets/distributor.svg){loading=lazy}

This design relies on the fact that Ookla allows tests 'on demand' rather than following an exact and strict regiment of 'one per hour per IP'. It also assumes the user is setting up NetCheck on the one LAN with a single WAN IP shared between all clients. Otherwise each client would be limited more than they need to be.

Also an hour [wasn't hard coded](https://github.com/mcloughlan/NetCheck/blob/3494e07d93f0e3dabec84038ad4d26f69902a494/docker-compose.yml#L14) in the case someone had a [private speedtest server](https://github.com/mcloughlan/NetCheck/blob/3494e07d93f0e3dabec84038ad4d26f69902a494/docker-compose.yml#L16) and could run a test every few minutes.

## Conclusion

This project taught me so much stuff

- Distributed computing (or at least distributed *computers*)
- Docker and containers
- Grafana
  - And more stuff about databases
- Logging
- Remote access
- The security concerns of BSSIDs (lol)
- Documenting for others
- Designing dynamic UI for alerts and error identification

Thanks to Ben Fon who got me onto making this project and bought some Pis for it.
