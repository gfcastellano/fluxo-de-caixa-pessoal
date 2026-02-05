---
name: managing-time
description: Handles time and timezone operations via MCP. Use when the user asks about current time, timezone conversions, or scheduling across timezones. Triggers on keywords like 'time', 'timezone', 'hora', 'fuso horário', 'convert time', 'what time is it'.
---

# Managing Time via MCP

This skill provides instructions for time and timezone operations through MCP tools.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `get_current_time` | Get the current time in a specific timezone |
| `convert_time` | Convert time between timezones |

---

## Get Current Time

Get the current time in any IANA timezone:

```
get_current_time(timezone: "America/Sao_Paulo")
get_current_time(timezone: "Europe/London")
get_current_time(timezone: "Asia/Tokyo")
```

### Common Timezone Names

| Region | Timezone ID |
|--------|-------------|
| **Brazil** | `America/Sao_Paulo`, `America/Manaus`, `America/Fortaleza`, `America/Recife`, `America/Bahia`, `America/Belem`, `America/Cuiaba`, `America/Porto_Velho`, `America/Rio_Branco` |
| **USA** | `America/New_York`, `America/Los_Angeles`, `America/Chicago`, `America/Denver`, `America/Phoenix`, `America/Anchorage`, `Pacific/Honolulu` |
| **Canada** | `America/Toronto`, `America/Vancouver`, `America/Montreal`, `America/Edmonton`, `America/Winnipeg`, `America/Halifax` |
| **Mexico** | `America/Mexico_City`, `America/Tijuana`, `America/Cancun`, `America/Monterrey` |
| **Central America** | `America/Guatemala`, `America/Panama`, `America/Costa_Rica`, `America/El_Salvador` |
| **South America** | `America/Buenos_Aires`, `America/Santiago`, `America/Lima`, `America/Bogota`, `America/Caracas`, `America/Montevideo`, `America/Asuncion`, `America/La_Paz`, `America/Guayaquil` |
| **UK & Ireland** | `Europe/London`, `Europe/Dublin` |
| **Western Europe** | `Europe/Paris`, `Europe/Berlin`, `Europe/Amsterdam`, `Europe/Brussels`, `Europe/Madrid`, `Europe/Rome`, `Europe/Vienna`, `Europe/Zurich`, `Europe/Lisbon` |
| **Eastern Europe** | `Europe/Warsaw`, `Europe/Prague`, `Europe/Budapest`, `Europe/Bucharest`, `Europe/Sofia`, `Europe/Athens`, `Europe/Helsinki`, `Europe/Kiev` |
| **Nordic** | `Europe/Stockholm`, `Europe/Oslo`, `Europe/Copenhagen`, `Europe/Helsinki` |
| **Russia** | `Europe/Moscow`, `Europe/Kaliningrad`, `Asia/Yekaterinburg`, `Asia/Novosibirsk`, `Asia/Vladivostok` |
| **Middle East** | `Asia/Dubai`, `Asia/Riyadh`, `Asia/Jerusalem`, `Asia/Tehran`, `Asia/Baghdad`, `Asia/Kuwait`, `Asia/Qatar`, `Asia/Bahrain` |
| **South Asia** | `Asia/Kolkata`, `Asia/Karachi`, `Asia/Dhaka`, `Asia/Colombo`, `Asia/Kathmandu` |
| **Southeast Asia** | `Asia/Singapore`, `Asia/Bangkok`, `Asia/Jakarta`, `Asia/Ho_Chi_Minh`, `Asia/Manila`, `Asia/Kuala_Lumpur` |
| **East Asia** | `Asia/Tokyo`, `Asia/Shanghai`, `Asia/Hong_Kong`, `Asia/Seoul`, `Asia/Taipei` |
| **Australia** | `Australia/Sydney`, `Australia/Melbourne`, `Australia/Brisbane`, `Australia/Perth`, `Australia/Adelaide`, `Australia/Darwin`, `Australia/Hobart` |
| **New Zealand** | `Pacific/Auckland`, `Pacific/Chatham` |
| **Pacific** | `Pacific/Fiji`, `Pacific/Guam`, `Pacific/Tahiti`, `Pacific/Samoa` |
| **Africa** | `Africa/Cairo`, `Africa/Johannesburg`, `Africa/Lagos`, `Africa/Nairobi`, `Africa/Casablanca`, `Africa/Tunis`, `Africa/Accra` |
| **UTC** | `UTC`, `Etc/UTC`, `Etc/GMT` |

---

## Convert Time

Convert a specific time between timezones:

```
convert_time(
  time: "14:30",
  source_timezone: "America/Sao_Paulo",
  target_timezone: "Europe/London"
)
```

### Parameters

- **time**: Time in 24-hour format (HH:MM)
- **source_timezone**: IANA timezone of the source time
- **target_timezone**: IANA timezone to convert to

---

## Use Cases

### Scheduling Meetings
When scheduling across timezones:
1. Get current time in both locations
2. Convert proposed meeting time to all participant timezones

### Working with APIs
When dealing with timestamps from different sources:
1. Identify the source timezone
2. Convert to local or UTC as needed

---

## Tips

- Always use IANA timezone identifiers (e.g., `America/Sao_Paulo` not `BRT`)
- For UTC, use `UTC` or `Etc/UTC`
- If user doesn't specify timezone, default to `Europe/Paris` per system config
